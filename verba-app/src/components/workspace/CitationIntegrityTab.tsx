import React, { useState, useEffect } from 'react';
import { BadgeCheck, ShieldAlert, CheckCircle, AlertTriangle, ChevronDown, FileText } from 'lucide-react';
import { useCitationContext } from './CitationContext';
import { WorkspaceTab } from './WorkspaceNavigation';
import { evaluateCitationIntegrity, CitationIntegrityResult } from '@/lib/citations/integrity';

interface Props {
  documentId: string;
  workId: string | null;
  onNavigate: (tab: WorkspaceTab) => void;
}

export function CitationIntegrityTab({ documentId, workId, onNavigate }: Props) {
  const { sources, style, documentCitations } = useCitationContext();
  const [results, setResults] = useState<{ result: CitationIntegrityResult, contextText: string }[]>([]);
  const [filter, setFilter] = useState<'all' | 'needs_review'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    // Re-evaluate whenever documentCitations or sources change
    const newResults = documentCitations.map(cit => {
      const result = evaluateCitationIntegrity(cit.citationId, cit.sourceId, sources, style);
      
      // Attempt deterministic context extraction via DOM
      let contextText = '';
      try {
        const el = document.querySelector(`[data-citation-id="${cit.citationId}"]`);
        if (el && el.parentElement) {
          // get the paragraph text
          contextText = el.parentElement.textContent || '';
        }
      } catch (e) {}

      return { result, contextText };
    });

    setResults(newResults);
  }, [documentCitations, sources, style]);

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
          <h3 className="text-[14px] font-semibold text-[#0B1628] flex items-center gap-2">
            Citation Integrity
          </h3>
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

  const healthyCount = results.filter(r => r.result.overall === 'healthy').length;
  const reviewCount = results.filter(r => r.result.overall === 'needs_review').length;
  const criticalCount = results.filter(r => r.result.overall === 'critical').length;

  const filtered = filter === 'all' 
    ? results 
    : results.filter(r => r.result.overall !== 'healthy');

  const renderStatus = (status: string) => {
    switch (status) {
      case 'valid':
      case 'confirmed': 
        return <span className="text-status-success flex items-center gap-1"><CheckCircle size={12}/> {status.charAt(0).toUpperCase() + status.slice(1)}</span>;
      case 'warning':
      case 'broken':
      case 'conflict':
      case 'missing':
        return <span className="text-status-error flex items-center gap-1"><ShieldAlert size={12}/> {status.charAt(0).toUpperCase() + status.slice(1)}</span>;
      case 'partial':
      case 'unverified':
        return <span className="text-status-warning flex items-center gap-1"><AlertTriangle size={12}/> {status.charAt(0).toUpperCase() + status.slice(1)}</span>;
      case 'full_text_available':
        return <span className="text-status-success">Full text available</span>;
      case 'abstract_available':
        return <span className="text-foreground-secondary">Abstract available</span>;
      case 'metadata_only':
        return <span className="text-status-warning">Metadata only</span>;
      default: 
        return <span className="text-foreground-secondary capitalize">{status.replace(/_/g, ' ')}</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F6F8FB]">
      {/* Summary Header */}
      <div className="p-4 border-b border-border-light shrink-0 bg-white">
        <h3 className="text-[14px] font-semibold text-[#0B1628]">Citation Integrity</h3>
        <p className="text-[12px] text-foreground-secondary mt-1 leading-relaxed">
          Check whether citations are properly connected to your claims and sources.
        </p>

        <div className="mt-4 flex items-center gap-3 text-[12px]">
          <div className="flex items-center gap-1.5 font-medium text-foreground-secondary">
            <span className="w-2 h-2 rounded-full bg-status-success" />
            {healthyCount} Healthy
          </div>
          <div className="flex items-center gap-1.5 font-medium text-foreground-secondary">
            <span className="w-2 h-2 rounded-full bg-status-warning" />
            {reviewCount} Need Review
          </div>
          <div className="flex items-center gap-1.5 font-medium text-foreground-secondary">
            <span className="w-2 h-2 rounded-full bg-status-error" />
            {criticalCount} Critical
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button 
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors ${filter === 'all' ? 'bg-black/10 text-[#0B1628]' : 'text-foreground-secondary hover:bg-black/5'}`}
          >
            All Citations
          </button>
          <button 
            onClick={() => setFilter('needs_review')}
            className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors ${filter === 'needs_review' ? 'bg-black/10 text-[#0B1628]' : 'text-foreground-secondary hover:bg-black/5'}`}
          >
            Needs Review
          </button>
        </div>
      </div>

      {/* Citation List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filtered.map(({ result, contextText }, idx) => {
          const isExpanded = expandedId === result.citationId;
          const source = sources.find(s => s.id === result.sourceId);

          return (
            <div key={result.citationId} className={`bg-white border rounded shadow-sm flex flex-col ${
              result.overall === 'critical' ? 'border-status-error/30' :
              result.overall === 'needs_review' ? 'border-status-warning/40' :
              'border-border-light'
            }`}>
              
              {/* Warnings Header */}
              {result.warnings.length > 0 && (
                <div className="bg-status-error/10 text-status-error text-[11px] font-bold px-3 py-1.5 rounded-t border-b border-status-error/20 flex flex-col gap-0.5">
                  {result.warnings.map((w, i) => <div key={i} className="flex items-center gap-1"><ShieldAlert size={12}/> {w}</div>)}
                </div>
              )}

              <div className="p-3 text-[12px] space-y-2.5">
                {/* Source Title & Authors */}
                <div>
                  <h4 className="font-semibold text-[#0B1628] leading-tight mb-1">
                    {source ? source.title : 'Unknown Source'}
                  </h4>
                  {source && (
                    <div className="text-foreground-secondary text-[11px]">
                      ({source.authors.map(a => a.family).join(', ')}, {source.publication_year || 'Unknown Year'})
                    </div>
                  )}
                </div>

                {/* Claim Context */}
                {contextText && (
                  <div className="bg-[#F6F8FB] p-2 rounded text-[11px] text-foreground-secondary italic border-l-2 border-border-light leading-relaxed">
                    "{contextText}"
                  </div>
                )}

                {/* Quick Status Bar */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] pt-1">
                  <div className="flex flex-col">
                    <span className="text-foreground-muted uppercase tracking-wider text-[9px] font-bold">Link</span>
                    {renderStatus(result.linkage.status)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-foreground-muted uppercase tracking-wider text-[9px] font-bold">Identity</span>
                    {renderStatus(result.sourceIdentity.status)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-foreground-muted uppercase tracking-wider text-[9px] font-bold">Bibliography</span>
                    {renderStatus(result.bibliography.status)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-foreground-muted uppercase tracking-wider text-[9px] font-bold">Evidence</span>
                    {renderStatus(result.evidenceAvailability.status)}
                  </div>
                </div>
                
                {/* Claim Support (Mocked pre-H2) */}
                <div className="pt-2 border-t border-border-light mt-1">
                  <span className="text-foreground-muted uppercase tracking-wider text-[9px] font-bold block mb-1">Claim Support</span>
                  <span className="text-foreground-secondary font-medium">Not checked</span>
                </div>

                {/* Actions */}
                <div className="pt-2">
                  <button 
                    onClick={() => setExpandedId(isExpanded ? null : result.citationId)}
                    className="text-accent hover:underline text-[11px] flex items-center gap-1 font-medium"
                  >
                    {isExpanded ? 'Hide Details' : 'View Details'} <ChevronDown size={12} className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-border-light space-y-3 bg-[#F6F8FB] -mx-3 -mb-3 p-3 rounded-b text-[11px]">
                    <div>
                      <span className="font-semibold text-foreground-secondary block mb-1">Claim Support</span>
                      <p className="text-foreground-secondary leading-relaxed">Verba has not yet evaluated whether this source supports the exact claim. Claim-level support checking will be available in future updates.</p>
                    </div>
                    {result.linkage.reasons.length > 0 && (
                      <div>
                        <span className="font-semibold text-foreground-secondary block mb-1">Linkage Issues</span>
                        <ul className="text-foreground-secondary list-disc pl-4">
                          {result.linkage.reasons.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                    {result.bibliography.reasons.length > 0 && (
                      <div>
                        <span className="font-semibold text-foreground-secondary block mb-1">Bibliography Issues</span>
                        <ul className="text-foreground-secondary list-disc pl-4">
                          {result.bibliography.reasons.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
