import React, { useState, useEffect, useRef } from 'react';
import {
  BadgeCheck, ShieldAlert, CheckCircle, AlertTriangle,
  ChevronDown, FileText, Info, Clock, Unlink2, Search, ExternalLink,
} from 'lucide-react';
import { useCitationContext } from './CitationContext';
import { WorkspaceTab } from './WorkspaceNavigation';
import { evaluateCitationIntegrity, CitationIntegrityResult } from '@/lib/citations/integrity';
import { formatInlineCitation } from '@/lib/citations/formatter';

interface Props {
  documentId: string;
  workId: string | null;
  onNavigate: (tab: WorkspaceTab) => void;
}

type EvaluatedCitation = {
  result: CitationIntegrityResult;
  contextText: string;
  inlineLabel: string;
  /** claim hash from previous render — used for stale detection */
  prevHash: string | null;
};

// ─── H2D: UX Tier → Display Config ────────────────────────────────────────────

type UXTier = 'good' | 'warning' | 'problem';

function getTier(result: CitationIntegrityResult): UXTier {
  if (result.overall === 'critical') return 'problem';
  if (result.overall === 'needs_review') return 'warning';
  // H2: claim support or relevance flags can also trigger warning
  if (result.topicRelevance.flagged) return 'warning';
  if (result.claimSupport.uxTier === 'problem') return 'problem';
  if (result.claimSupport.uxTier === 'warning') return 'warning';
  if (result.claimSupport.temporalWarning) return 'warning';
  return 'good';
}

function tierConfig(tier: UXTier) {
  switch (tier) {
    case 'good':
      return {
        icon: <CheckCircle size={14} className="text-status-success" />,
        label: 'Looks good',
        dot: 'bg-status-success',
        border: 'border-status-success/20',
        bg: 'bg-status-success/5',
        textColor: 'text-status-success',
        symbol: '✓',
      };
    case 'warning':
      return {
        icon: <AlertTriangle size={14} className="text-status-warning" />,
        label: 'Worth checking',
        dot: 'bg-status-warning',
        border: 'border-status-warning/30',
        bg: 'bg-status-warning/5',
        textColor: 'text-status-warning',
        symbol: '⚠',
      };
    case 'problem':
      return {
        icon: <ShieldAlert size={14} className="text-status-error" />,
        label: 'Problem found',
        dot: 'bg-status-error',
        border: 'border-status-error/30',
        bg: 'bg-status-error/5',
        textColor: 'text-status-error',
        symbol: '●',
      };
  }
}

function primaryH2Message(result: CitationIntegrityResult): string {
  // Stale
  if (result.claimSupport.isStale) {
    return 'The claim text has changed. Previous support analysis may no longer apply.';
  }
  // Possible contradiction first
  if (result.claimSupport.status === 'possibly_contradicted') {
    return 'The available source evidence appears to conflict with this statement.';
  }
  // Problem-level H1 reason
  if (result.primaryReason && result.primaryReason.severity === 'critical') {
    return result.primaryReason.shortMessage;
  }
  // Unrelated citation
  if (result.topicRelevance.status === 'unrelated') {
    return 'This source appears unrelated to the statement it is attached to.';
  }
  if (result.topicRelevance.status === 'low' && result.topicRelevance.flagged) {
    return 'This source has limited topical overlap with the cited statement.';
  }
  // Claim support issues
  if (result.claimSupport.shortMessage) {
    return result.claimSupport.shortMessage;
  }
  // Temporal
  if (result.claimSupport.temporalWarning) {
    return 'Time-sensitive claim: the cited source may be outdated.';
  }
  // H1 review reasons
  if (result.primaryReason) {
    return result.primaryReason.shortMessage;
  }
  return 'No issues detected.';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EvidenceBadge({ result }: { result: CitationIntegrityResult }) {
  if (!result.evidenceDetail) return null;
  const level = result.evidenceDetail.level;
  const colors = ['text-foreground-muted', 'text-foreground-secondary', 'text-status-success', 'text-status-success'];
  return (
    <span className={`text-[10px] font-medium ${colors[level]}`}>
      {result.evidenceDetail.label}
    </span>
  );
}

function ClaimSupportBadge({ result }: { result: CitationIntegrityResult }) {
  const { status, uxTier, isStale } = result.claimSupport;
  if (status === 'not_checked') return null;
  if (isStale) return <span className="text-[10px] text-foreground-muted italic">Analysis may be stale</span>;

  const map: Record<string, { label: string; color: string }> = {
    insufficient_evidence: { label: 'Not enough evidence', color: 'text-foreground-muted' },
    supported: { label: 'Supported', color: 'text-status-success' },
    partially_supported: { label: 'Partially supported', color: 'text-status-warning' },
    unclear: { label: 'Could not confirm', color: 'text-foreground-secondary' },
    possibly_contradicted: { label: 'Possible conflict', color: 'text-status-error' },
  };

  const cfg = map[status] || { label: status, color: 'text-foreground-muted' };
  return <span className={`text-[10px] font-medium ${cfg.color}`}>{cfg.label}</span>;
}

function EvidencePassages({ result }: { result: CitationIntegrityResult }) {
  const passages = result.claimSupport.evidencePassages;
  if (!passages || passages.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted block">Evidence checked</span>
      {passages.map((p, i) => (
        <div key={i} className="bg-white/80 border border-border-light rounded p-2 text-[11px] text-foreground-secondary leading-relaxed">
          {p.section && <span className="text-[9px] uppercase font-bold text-foreground-muted block mb-0.5">{p.section}</span>}
          <span className="italic">"{p.text}"</span>
          {p.sourceUrl && (
            <a
              href={p.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-accent hover:underline inline-flex items-center gap-0.5"
            >
              <ExternalLink size={10} /> Open source
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function ActionBar({
  result,
  onNavigate,
}: {
  result: CitationIntegrityResult;
  onNavigate: (tab: WorkspaceTab) => void;
}) {
  const { status } = result.claimSupport;
  const tier = getTier(result);

  const canFindBetter =
    result.topicRelevance.status === 'unrelated' ||
    result.topicRelevance.status === 'low' ||
    status === 'insufficient_evidence' ||
    status === 'partially_supported';

  const canViewSource = result.evidenceDetail && result.evidenceDetail.oaUrl;

  return (
    <div className="flex flex-wrap gap-1.5 pt-2 mt-1 border-t border-border-light">
      {canFindBetter && (
        <button
          onClick={() => onNavigate('research')}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-accent/10 text-accent rounded hover:bg-accent/20 transition-colors"
        >
          <Search size={10} /> Find better source
        </button>
      )}
      {canViewSource && (
        <a
          href={result.evidenceDetail!.oaUrl!}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-black/5 text-foreground-secondary rounded hover:bg-black/10 transition-colors"
        >
          <ExternalLink size={10} /> View source
        </a>
      )}
      {tier !== 'good' && (
        <button className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-black/5 text-foreground-secondary rounded hover:bg-black/10 transition-colors">
          Keep citation
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CitationIntegrityTab({ documentId, workId, onNavigate }: Props) {
  const { sources, style, documentCitations } = useCitationContext();
  const [evaluations, setEvaluations] = useState<EvaluatedCitation[]>([]);
  const [showGood, setShowGood] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const prevHashesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const newEvals: EvaluatedCitation[] = documentCitations.map(cit => {
      const prevHash = prevHashesRef.current[cit.citationId] || null;

      // DOM context extraction
      let contextText = '';
      try {
        const el = document.querySelector(`[data-citation-id="${cit.citationId}"]`);
        if (el?.parentElement) {
          contextText = el.parentElement.textContent || '';
        }
      } catch (_) {}

      const result = evaluateCitationIntegrity(
        cit.citationId,
        cit.sourceId,
        sources,
        style,
        contextText || undefined,
        prevHash || undefined,
      );

      // Update hash cache for stale detection on next render
      if (result.claimScope?.claimHash) {
        prevHashesRef.current[cit.citationId] = result.claimScope.claimHash;
      }

      const source = sources.find(s => s.id === cit.sourceId) || null;
      const inlineLabel = source
        ? formatInlineCitation(source, style, undefined)
        : 'Unknown source';

      return { result, contextText, inlineLabel, prevHash };
    });
    setEvaluations(newEvals);
  }, [documentCitations, sources, style]);

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!workId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-[#F6F8FB]">
        <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mb-4 text-foreground-muted">
          <BadgeCheck size={24} />
        </div>
        <p className="text-[13px] text-foreground-secondary leading-relaxed max-w-[240px]">
          This document isn't connected to a Verba work yet.
        </p>
      </div>
    );
  }

  if (documentCitations.length === 0) {
    return (
      <div className="flex flex-col h-full bg-[#F6F8FB]">
        <div className="p-4 border-b border-border-light shrink-0 bg-white">
          <h3 className="text-[14px] font-semibold text-[#0B1628]">Citation Integrity</h3>
          <p className="text-[12px] text-foreground-secondary mt-1 leading-relaxed">
            Check whether citations are properly connected to your claims and sources.
          </p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mb-4 text-foreground-muted">
            <FileText size={24} />
          </div>
          <p className="text-[13px] text-[#0B1628] font-medium mb-1">No citations to check yet.</p>
          <p className="text-[12px] text-foreground-secondary leading-relaxed mb-4">
            Insert sources through Cite, then return here to review citation integrity.
          </p>
          <button
            onClick={() => onNavigate('cite')}
            className="h-8 px-4 bg-accent text-white rounded text-[13px] font-medium hover:bg-accent-hover transition-colors"
          >
            Go to Cite
          </button>
        </div>
      </div>
    );
  }

  // ── Exception-First UX ─────────────────────────────────────────────────────
  const good     = evaluations.filter(e => getTier(e.result) === 'good');
  const warnings = evaluations.filter(e => getTier(e.result) === 'warning');
  const problems = evaluations.filter(e => getTier(e.result) === 'problem');
  const total    = evaluations.length;

  const needsAttention = [...problems, ...warnings];

  return (
    <div className="flex flex-col h-full bg-[#F6F8FB]">

      {/* ── Summary Header ── */}
      <div className="p-4 border-b border-border-light shrink-0 bg-white">
        <h3 className="text-[14px] font-semibold text-[#0B1628]">Citation Integrity</h3>
        <p className="text-[12px] text-foreground-secondary mt-0.5 leading-relaxed">
          {total} citation{total !== 1 ? 's' : ''} checked
        </p>

        <div className="mt-3 flex items-center gap-4 text-[12px]">
          <span className="flex items-center gap-1.5 text-status-success font-medium">
            <span className="w-2 h-2 rounded-full bg-status-success" />
            {good.length} look good
          </span>
          {warnings.length > 0 && (
            <span className="flex items-center gap-1.5 text-status-warning font-medium">
              <span className="w-2 h-2 rounded-full bg-status-warning" />
              {warnings.length} worth checking
            </span>
          )}
          {problems.length > 0 && (
            <span className="flex items-center gap-1.5 text-status-error font-medium">
              <span className="w-2 h-2 rounded-full bg-status-error" />
              {problems.length} problem{problems.length !== 1 ? 's' : ''} found
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* ── Needs Attention Section ── */}
        {needsAttention.length > 0 && (
          <>
            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground-muted mb-2">
              Needs your attention
            </p>

            {needsAttention.map(({ result, contextText, inlineLabel }) => {
              const tier = getTier(result);
              const cfg = tierConfig(tier);
              const isExpanded = expandedId === result.citationId;
              const source = sources.find(s => s.id === result.sourceId);

              return (
                <div
                  key={result.citationId}
                  className={`bg-white border rounded shadow-sm ${cfg.border}`}
                >
                  {/* Collapsed header */}
                  <div className={`px-3 py-2.5 flex items-start gap-2 ${cfg.bg} border-b ${cfg.border}`}>
                    <span className="shrink-0 mt-0.5">{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[12px] font-semibold text-[#0B1628] truncate">
                          {inlineLabel}
                        </span>
                        {source && (
                          <span className="text-[11px] text-foreground-muted truncate">
                            {source.title}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-foreground-secondary mt-0.5 leading-snug">
                        {primaryH2Message(result)}
                      </p>
                    </div>
                  </div>

                  <div className="px-3 py-2 space-y-2">
                    {/* Claim context snippet */}
                    {contextText && (
                      <div className="bg-[#F6F8FB] p-2 rounded text-[11px] text-foreground-secondary italic border-l-2 border-border-light leading-relaxed">
                        "{contextText.slice(0, 180)}{contextText.length > 180 ? '…' : ''}"
                      </div>
                    )}

                    {/* Quick facts row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                      <span className="text-foreground-muted">Evidence:</span>
                      <EvidenceBadge result={result} />
                      {result.claimSupport.status !== 'not_checked' && (
                        <>
                          <span className="text-foreground-muted">·</span>
                          <span className="text-foreground-muted">Claim:</span>
                          <ClaimSupportBadge result={result} />
                        </>
                      )}
                      {result.claimSupport.temporalWarning && (
                        <>
                          <span className="text-foreground-muted">·</span>
                          <span className="inline-flex items-center gap-0.5 text-status-warning text-[10px]">
                            <Clock size={9} /> Time-sensitive
                          </span>
                        </>
                      )}
                      {result.topicRelevance.flagged && (
                        <>
                          <span className="text-foreground-muted">·</span>
                          <span className="inline-flex items-center gap-0.5 text-status-warning text-[10px]">
                            <Unlink2 size={9} /> May be unrelated
                          </span>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <ActionBar result={result} onNavigate={onNavigate} />

                    {/* Technical details toggle */}
                    <div className="pt-1">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : result.citationId)}
                        className="text-accent hover:underline text-[10px] flex items-center gap-1 font-medium"
                      >
                        {isExpanded ? 'Hide details' : 'Technical details'}
                        <ChevronDown
                          size={11}
                          className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>

                    {/* ── Expanded Technical Details ── */}
                    {isExpanded && (
                      <div className="mt-2 pt-3 border-t border-border-light space-y-3 bg-[#F6F8FB] -mx-3 -mb-2 p-3 rounded-b text-[11px]">

                        {/* Claim context / atomic claims */}
                        {result.claimScope && result.claimScope.atomicClaims.length > 1 && (
                          <div>
                            <span className="font-semibold text-foreground-secondary block mb-1">Claim analysis</span>
                            {result.claimSupport.supportedParts.length > 0 && (
                              <ul className="mb-1 space-y-0.5">
                                {result.claimSupport.supportedParts.map((p, i) => (
                                  <li key={i} className="flex gap-1 text-status-success"><CheckCircle size={10} className="shrink-0 mt-0.5" />{p}</li>
                                ))}
                              </ul>
                            )}
                            {result.claimSupport.unresolvedParts.length > 0 && (
                              <ul className="space-y-0.5">
                                {result.claimSupport.unresolvedParts.map((p, i) => (
                                  <li key={i} className="flex gap-1 text-foreground-muted"><Info size={10} className="shrink-0 mt-0.5" />{p}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        {/* Claim detail message */}
                        {result.claimSupport.detailMessage && (
                          <div>
                            <span className="font-semibold text-foreground-secondary block mb-1">Verba found</span>
                            <p className="text-foreground-secondary leading-snug">{result.claimSupport.detailMessage}</p>
                          </div>
                        )}

                        {/* Temporal warning */}
                        {result.claimSupport.temporalWarning && (
                          <div className="flex gap-2 p-2 bg-status-warning/10 rounded border border-status-warning/20">
                            <Clock size={11} className="shrink-0 mt-0.5 text-status-warning" />
                            <p className="text-foreground-secondary leading-snug">{result.claimSupport.temporalWarning}</p>
                          </div>
                        )}

                        {/* Topic relevance */}
                        <div>
                          <span className="font-semibold text-foreground-secondary block mb-0.5">Topic relevance</span>
                          <p className="text-foreground-secondary">{result.topicRelevance.reason}</p>
                        </div>

                        {/* Evidence passages */}
                        <EvidencePassages result={result} />

                        {/* H1 structural integrity */}
                        <div className="space-y-2 pt-1 border-t border-border-light">
                          <span className="font-semibold text-foreground-secondary block">Source details</span>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                            {[
                              ['Citation link', result.linkage.status],
                              ['Source identity', result.sourceIdentity.status],
                              ['Bibliography', result.bibliography.status],
                              ['Evidence level', result.evidenceDetail?.label || result.evidenceAvailability.status],
                            ].map(([label, val]) => (
                              <div key={label} className="flex flex-col">
                                <span className="text-[9px] uppercase tracking-wider font-bold text-foreground-muted">{label}</span>
                                <span className="text-foreground-secondary capitalize">{val}</span>
                              </div>
                            ))}
                          </div>
                          {result.sourceIdentity.providers.length > 0 && (
                            <p className="text-foreground-muted text-[10px]">
                              Verified by: {result.sourceIdentity.providers.join(', ')}
                            </p>
                          )}
                          {result.reasons.length > 0 && (
                            <ul className="space-y-1">
                              {result.reasons.map(r => (
                                <li key={r.code} className="flex gap-1.5 text-foreground-secondary leading-snug">
                                  <span className="shrink-0 mt-0.5">
                                    {r.severity === 'critical'
                                      ? <ShieldAlert size={10} className="text-status-error" />
                                      : <AlertTriangle size={10} className="text-status-warning" />}
                                  </span>
                                  {r.message}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── "Good" citations section ── */}
        {good.length > 0 && (
          <div className={`${needsAttention.length > 0 ? 'pt-2 border-t border-border-light mt-1' : ''}`}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-status-success font-semibold flex items-center gap-1.5">
                <CheckCircle size={12} />
                {good.length} citation{good.length !== 1 ? 's' : ''} look good
              </p>
              <button
                onClick={() => setShowGood(v => !v)}
                className="text-[10px] text-accent hover:underline flex items-center gap-0.5"
              >
                {showGood ? 'Hide' : 'Show'}
                <ChevronDown size={10} className={`transform transition-transform ${showGood ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showGood && (
              <div className="mt-2 space-y-2">
                {good.map(({ result, inlineLabel }) => {
                  const source = sources.find(s => s.id === result.sourceId);
                  return (
                    <div key={result.citationId} className="bg-white border border-status-success/20 rounded px-3 py-2 flex items-center gap-2">
                      <CheckCircle size={12} className="text-status-success shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] font-medium text-[#0B1628]">{inlineLabel}</span>
                        {source && (
                          <p className="text-[10px] text-foreground-muted truncate">{source.title}</p>
                        )}
                      </div>
                      <EvidenceBadge result={result} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── All good / empty state ── */}
        {needsAttention.length === 0 && good.length > 0 && (
          <div className="flex flex-col items-center justify-center text-center py-6 text-foreground-secondary">
            <CheckCircle size={28} className="text-status-success mb-2" />
            <p className="text-[13px] font-semibold text-[#0B1628]">All citations look good.</p>
            <p className="text-[12px] mt-1">No issues requiring your attention.</p>
          </div>
        )}
      </div>
    </div>
  );
}
