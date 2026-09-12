import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2, BookOpen, ExternalLink, ShieldAlert, CheckCircle, AlertTriangle, ChevronDown, Plus, Sparkles } from 'lucide-react';
import { useCitationContext } from './CitationContext';
import { ResearchResult } from '@/lib/research/types';
import { NormalizedSource } from '@/lib/sources/types';
import { getSourceTrackId } from '@/lib/sources/normalize';
import { ContextualSelection } from '../DocumentEditor';
import { extractPassageClaims } from '@/lib/citations/scope';

interface ResearchTabProps {
  workId: string | null;
  onSourceSaved?: (newSource?: any) => void;
  evidenceSelection?: ContextualSelection | null;
  onClearEvidenceSelection?: () => void;
  onInsertCitation?: (sourceId: string) => void;
}

export function ResearchTab({ workId, onSourceSaved, evidenceSelection, onClearEvidenceSelection, onInsertCitation }: ResearchTabProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [providerStatus, setProviderStatus] = useState<Record<string, string> | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isEvidenceLoading, setIsEvidenceLoading] = useState(false);
  const [isContextExpanded, setIsContextExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contextTextRef = useRef<HTMLParagraphElement>(null);
  
  // Passage mode state
  const [researchMode, setResearchMode] = useState<'claim' | 'passage' | 'passage_search' | null>(null);
  const [passageClaims, setPassageClaims] = useState<string[]>([]);
  const [activeClaim, setActiveClaim] = useState<string | null>(null);
  const [visibleClaimsCount, setVisibleClaimsCount] = useState(5);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setIsContextExpanded(false);
  }, [evidenceSelection]);

  useEffect(() => {
    const checkOverflow = () => {
      if (contextTextRef.current && !isContextExpanded) {
        setIsOverflowing(contextTextRef.current.scrollHeight > contextTextRef.current.clientHeight);
      }
    };
    // Slight delay to ensure DOM is fully laid out
    setTimeout(checkOverflow, 0);
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [evidenceSelection, isContextExpanded]);

  if (!workId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-[#F6F8FB]">
        <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mb-4 text-foreground-muted">
          <Search size={24} />
        </div>
        <p className="text-[13px] text-foreground-secondary leading-relaxed max-w-[240px]">
          This document isn't connected to a Verba work yet.
        </p>
      </div>
    );
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setErrorMsg('');
    setResults([]);
    setProviderStatus(null);
    setExpandedId(null);

    try {
      const res = await fetch(`/api/works/${workId}/research/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to search');
      }

      setResults(data.results || []);
      setProviderStatus(data.providerStatus || null);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvidence = async (targetClaim: string, isPassageSearch: boolean) => {
    if (!workId || !evidenceSelection) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setIsEvidenceLoading(true);
    setErrorMsg('');
    setResults([]);
    setProviderStatus(null);
    setExpandedId(null);
    
    try {
      const res = await fetch(`/api/works/${workId}/research/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          selected_claim: targetClaim,
          paragraph_context: evidenceSelection.paragraphText,
          is_passage_search: isPassageSearch
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to find evidence');
      
      setResults(data.results || []);
      setProviderStatus(data.providerStatus || null);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setErrorMsg(err.message);
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
        setIsEvidenceLoading(false);
      }
    }
  };

  React.useEffect(() => {
    if (!evidenceSelection || !workId) {
      setResearchMode(null);
      setPassageClaims([]);
      setActiveClaim(null);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }
    
    const claims = extractPassageClaims(evidenceSelection.originalText);
    setPassageClaims(claims);
    setVisibleClaimsCount(5);
    setActiveClaim(null);
    
    // Deterministic rule: 3+ claims triggers passage mode
    const mode = claims.length >= 3 ? 'passage' : 'claim';
    setResearchMode(mode);
    
    if (mode === 'claim') {
      fetchEvidence(evidenceSelection.originalText, false);
    }
  }, [evidenceSelection, workId]);

  const handleSave = async (result: ResearchResult) => {
    // Generate a temporary ID for tracking saving state
    const trackId = getSourceTrackId(result.source);
    setSavingId(trackId);
    try {
      // Map ResearchResult into a payload compatible with the existing sources route
      const payload: NormalizedSource = {
        ...result.source,
        metadata: {
          ...result.source.metadata,
          integrity: result.integrity,
          provenance: result.provenance,
        }
      };

      const res = await fetch(`/api/works/${workId}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'SOURCE_ALREADY_EXISTS') {
          // Already saved, just mark it as saved
          setSavedIds(prev => new Set(prev).add(trackId));
          return;
        }
        throw new Error(data.error || 'Failed to save source');
      }
      
      setSavedIds(prev => new Set(prev).add(trackId));
      // Notify parent so CitationProvider context is updated immediately
      onSourceSaved?.(data);
      return data.id; // Return the saved source ID
    } catch (err: any) {
      alert(err.message);
      return null;
    } finally {
      setSavingId(null);
    }
  };

  const handleCite = async (result: ResearchResult) => {
    const trackId = getSourceTrackId(result.source);
    // Attempt to save first
    let sourceId: string | null = null;
    if (!savedIds.has(trackId)) {
      sourceId = await handleSave(result);
    } else {
      // If already saved, we need its real ID. Since we didn't store it, we might need a better map, 
      // but for now onInsertCitation in Citations handles DOIs implicitly or we can just pass the trackId if the backend can resolve it.
      // Wait, onInsertCitation needs a real sourceId. Let's just call handleSave anyway (it handles duplicates).
      sourceId = await handleSave(result);
    }

    if (sourceId && onInsertCitation) {
      onInsertCitation(sourceId);
    }
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case 'confirmed': return <span className="text-status-success flex items-center gap-1"><CheckCircle size={12}/> Confirmed</span>;
      case 'partial': return <span className="text-status-warning flex items-center gap-1"><AlertTriangle size={12}/> Partial</span>;
      case 'conflict': return <span className="text-status-error flex items-center gap-1"><ShieldAlert size={12}/> Conflict</span>;
      case 'high': return <span className="text-status-success font-medium">High</span>;
      case 'medium': return <span className="text-status-warning font-medium">Medium</span>;
      case 'low': return <span className="text-foreground-secondary font-medium">Low</span>;
      case 'open': return <span className="text-status-success">Open Access</span>;
      case 'retracted': return <span className="text-status-error font-bold flex items-center gap-1"><ShieldAlert size={12}/> RETRACTED</span>;
      default: return <span className="text-foreground-secondary capitalize">{status.replace('_', ' ')}</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F6F8FB]">
      <div className="p-4 border-b border-border-light shrink-0 bg-white">
        <form onSubmit={handleSearch} className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input 
            type="text" 
            placeholder="Search academic sources..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
            disabled={loading}
            className="w-full h-8 pl-8 pr-3 text-[13px] bg-[#F6F8FB] border border-border-light rounded focus:outline-none focus:border-accent disabled:opacity-50"
          />
        </form>
        {providerStatus && Object.entries(providerStatus).some(([k, v]) => v !== 'ok') && (
          <div className="mt-2 p-2 bg-status-warning/10 border border-status-warning/20 rounded text-[11px] text-status-warning flex flex-col gap-1">
            <span className="font-semibold flex items-center gap-1"><AlertTriangle size={12}/> Provider Issues</span>
            {Object.entries(providerStatus).filter(([k,v]) => v !== 'ok').map(([k, v]) => (
              <span key={k}>{k}: {v}</span>
            ))}
          </div>
        )}
        {errorMsg && (
          <div className="mt-2 text-[12px] text-status-error">{errorMsg}</div>
        )}
        
        {evidenceSelection && (
          <div className="mt-3 p-3 bg-accent/5 border border-accent/20 rounded relative text-[12px] max-h-[50vh] overflow-y-auto">
            <button 
              onClick={onClearEvidenceSelection}
              className="absolute top-2 right-2 text-foreground-muted hover:text-foreground-secondary z-10 transition-colors"
              title="Clear evidence search"
            >
              &times;
            </button>
            <span className="font-semibold text-accent flex items-center gap-1.5 mb-1">
              <Sparkles size={12} />
              {researchMode === 'passage' && !activeClaim ? 'Several claims found in this passage' : 'Looking for evidence for'}
            </span>
            <p 
              ref={contextTextRef}
              className={`text-[#0B1628] leading-relaxed italic border-l-2 border-accent/30 pl-2 ${isContextExpanded ? '' : 'line-clamp-3'}`}
            >
              "{activeClaim || evidenceSelection.originalText}"
            </p>
            {(isOverflowing || isContextExpanded) && (
              <button 
                onClick={() => setIsContextExpanded(!isContextExpanded)}
                className="text-accent text-[11px] font-medium hover:underline mt-1.5 flex items-center gap-1"
              >
                {isContextExpanded ? 'Show less' : 'Show more'}
                <ChevronDown size={12} className={`transform transition-transform ${isContextExpanded ? 'rotate-180' : ''}`} />
              </button>
            )}
            
            {/* Passage Mode Claim Picker */}
            {researchMode === 'passage' && !activeClaim && (
              <div className="mt-3 pt-3 border-t border-accent/20">
                <p className="text-foreground-secondary mb-3">This passage contains multiple statements. Choose one to investigate:</p>
                <div className="space-y-2">
                  {passageClaims.slice(0, visibleClaimsCount).map((claim, idx) => (
                    <div key={idx} className="bg-white border border-border-light rounded p-2 flex flex-col gap-2 shadow-sm">
                      <p className="text-[#0B1628] leading-snug">"{claim}"</p>
                      <button
                        onClick={() => {
                          setActiveClaim(claim);
                          setResearchMode('claim');
                          fetchEvidence(claim, false);
                        }}
                        className="self-end text-accent font-medium hover:underline flex items-center gap-1 text-[11px]"
                      >
                        Find evidence
                      </button>
                    </div>
                  ))}
                </div>
                {passageClaims.length > visibleClaimsCount && (
                  <button
                    onClick={() => setVisibleClaimsCount(prev => prev + 3)}
                    className="w-full mt-2 py-1.5 text-accent font-medium text-center border border-accent/20 rounded hover:bg-accent/5 transition-colors"
                  >
                    Show {passageClaims.length - visibleClaimsCount} more
                  </button>
                )}
                <div className="mt-4 pt-3 border-t border-accent/20">
                  <button
                    onClick={() => {
                      setResearchMode('passage_search');
                      fetchEvidence(evidenceSelection.originalText, true);
                    }}
                    className="w-full py-2 bg-white border border-border-light rounded text-[#0B1628] font-medium hover:bg-border-light transition-colors text-center"
                  >
                    Search around the whole passage
                  </button>
                </div>
              </div>
            )}
            
            {/* Return to claims button */}
            {activeClaim && passageClaims.length >= 3 && (
              <div className="mt-2 pt-2 border-t border-accent/20">
                <button
                  onClick={() => {
                    setActiveClaim(null);
                    setResearchMode('passage');
                    setResults([]);
                    setProviderStatus(null);
                  }}
                  className="text-accent font-medium hover:underline text-[11px] flex items-center gap-1"
                >
                  &larr; Back to claims
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-foreground-muted animate-in fade-in duration-300">
            {isEvidenceLoading ? (
              <>
                <div className="flex items-center gap-2 mb-2 font-medium text-accent">
                  <Sparkles size={16} />
                  Looking for evidence...
                </div>
                <div className="flex items-center gap-2 text-[12px] mb-4">
                  <Loader2 size={14} className="animate-spin" />
                  Searching scholarly sources for this passage
                </div>
              </>
            ) : (
              <>
                <Loader2 size={24} className="animate-spin mb-2" />
                <span className="text-[12px]">Searching scholarly providers...</span>
              </>
            )}
          </div>
        ) : results.length === 0 && !errorMsg ? (
          <div className="text-center py-8">
            <BookOpen size={24} className="mx-auto text-foreground-muted mb-3" />
            <p className="text-[13px] text-foreground-secondary mb-1">Enter a topic, keywords, or title.</p>
            <p className="text-[12px] text-foreground-muted">Searches Crossref and OpenAlex.</p>
          </div>
        ) : (
          results.map((r, idx) => {
            const trackId = getSourceTrackId(r.source);
            const isSaved = savedIds.has(trackId);
            const isSaving = savingId === trackId;
            const isExpanded = expandedId === trackId;

            return (
              <div 
                key={idx} 
                className="bg-white border border-border-light rounded p-3 shadow-sm text-[13px] flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationFillMode: 'both', animationDelay: `${idx * 40}ms` }}
              >
                
                {/* Warnings */}
                {r.integrity.retraction === 'retracted' && (
                  <div className="bg-status-error/10 text-status-error font-bold p-1.5 rounded flex items-center gap-1.5 text-[12px]">
                    <ShieldAlert size={14} /> Warning: This paper has been retracted.
                  </div>
                )}

                <div>
                  {r.relationship && (
                    <div className="mb-2 p-2 bg-accent/5 border border-accent/20 rounded flex items-start gap-2">
                      <div className="mt-0.5 text-accent"><Sparkles size={14} /></div>
                      <div>
                        <span className="font-semibold text-accent block">{r.relationship}</span>
                        <span className="text-foreground-secondary">{r.conversationalText}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-1.5 py-0.5 bg-foreground-muted/10 text-foreground-secondary rounded text-[10px] font-semibold uppercase tracking-wider">
                      {r.source.source_type.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <h4 className="font-semibold text-[#0B1628] leading-tight mb-1">{r.source.title}</h4>
                  <div className="text-foreground-secondary text-[12px]">
                    {r.source.authors.map(a => `${a.given} ${a.family}`).join(', ')}
                  </div>
                  <div className="text-foreground-muted text-[11px] mt-0.5">
                    {r.source.container_title || 'Unknown Venue'} • {r.source.publication_year || 'Unknown Year'} 
                    {r.source.doi && <span> • {r.source.doi}</span>}
                  </div>
                </div>

                {/* Quick Status Bar */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] pt-2 border-t border-border-light">
                  <div className="flex items-center gap-1">
                    <span className="text-foreground-muted uppercase tracking-wider text-[9px] font-bold">Identity</span>
                    {renderStatus(r.integrity.identity.status)}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-foreground-muted uppercase tracking-wider text-[9px] font-bold">Relevance</span>
                    {renderStatus(r.integrity.relevance.status)}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-foreground-muted uppercase tracking-wider text-[9px] font-bold">Evidence</span>
                    {renderStatus(r.integrity.evidence_availability)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-light">
                  <button 
                    onClick={() => setExpandedId(isExpanded ? null : trackId)}
                    className="text-accent hover:underline text-[11px] flex items-center gap-1 font-medium"
                  >
                    {isExpanded ? 'Hide Details' : 'Show Details'} <ChevronDown size={12} className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSave(r)}
                      disabled={isSaved || isSaving}
                      className={`h-7 px-3 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                        isSaved ? 'bg-status-success/10 text-status-success' : 'bg-[#E5EAF0] text-[#0B1628] hover:bg-border-light'
                      }`}
                    >
                      {isSaving ? <Loader2 size={12} className="animate-spin" /> : isSaved ? <CheckCircle size={12} /> : <Plus size={12} />}
                      {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save'}
                    </button>
                    {onInsertCitation && (
                      <button
                        onClick={() => handleCite(r)}
                        disabled={isSaving}
                        className="h-7 px-3 rounded text-[11px] font-medium flex items-center gap-1.5 bg-accent text-white hover:bg-accent-hover transition-colors"
                      >
                        Cite Source
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border-light space-y-3 bg-[#F6F8FB] -mx-3 -mb-3 p-3 rounded-b text-[12px]">
                    {r.source.abstract && (
                      <div>
                        <span className="font-semibold text-foreground-secondary block mb-1">Abstract</span>
                        <p className="text-foreground-secondary leading-relaxed line-clamp-4 hover:line-clamp-none">{r.source.abstract}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="font-semibold text-foreground-secondary block mb-1">
                          {r.provenance.providers.length > 1 ? 'Verified across' : 'Found through'}
                        </span>
                        <div className="text-foreground-secondary">
                          {r.provenance.providers.map(p => p === 'openalex' ? 'OpenAlex' : p === 'crossref' ? 'Crossref' : p).join(' + ')}
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground-secondary block mb-1">Open Access</span>
                        <div className="text-foreground-secondary">
                          Status: {renderStatus(r.integrity.access.status)}
                          {r.integrity.access.pdf_url ? (
                            <a href={r.integrity.access.pdf_url} target="_blank" rel="noreferrer" className="block text-accent hover:underline mt-0.5 flex items-center gap-1">
                              View PDF <ExternalLink size={10} />
                            </a>
                          ) : r.integrity.access.status === 'open' && r.source.url ? (
                            <a href={r.source.url} target="_blank" rel="noreferrer" className="block text-accent hover:underline mt-0.5 flex items-center gap-1">
                              Open full text <ExternalLink size={10} />
                            </a>
                          ) : r.source.doi ? (
                            <a href={`https://doi.org/${r.source.doi}`} target="_blank" rel="noreferrer" className="block text-accent hover:underline mt-0.5 flex items-center gap-1">
                              View publication <ExternalLink size={10} />
                            </a>
                          ) : r.source.url ? (
                            <a href={r.source.url} target="_blank" rel="noreferrer" className="block text-accent hover:underline mt-0.5 flex items-center gap-1">
                              Open source <ExternalLink size={10} />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {r.integrity.identity.reasons.length > 0 && (
                      <div>
                        <span className="font-semibold text-foreground-secondary block mb-1">Identity Notes</span>
                        <ul className="text-foreground-secondary list-disc pl-4">
                          {r.integrity.identity.reasons.map((note, i) => <li key={i}>{note}</li>)}
                        </ul>
                      </div>
                    )}

                    {r.integrity.relevance.reasons.length > 0 && (
                      <div>
                        <span className="font-semibold text-foreground-secondary block mb-1">Relevance Signals</span>
                        <ul className="text-foreground-secondary list-disc pl-4">
                          {r.integrity.relevance.reasons.map((note, i) => <li key={i}>{note}</li>)}
                        </ul>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
