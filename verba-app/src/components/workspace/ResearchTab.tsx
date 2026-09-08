import React, { useState } from 'react';
import { Search, Loader2, BookOpen, ExternalLink, ShieldAlert, CheckCircle, AlertTriangle, ChevronDown, Plus } from 'lucide-react';
import { useCitationContext } from './CitationContext';
import { ResearchResult } from '@/lib/research/types';
import { NormalizedSource } from '@/lib/sources/types';

interface ResearchTabProps {
  workId: string | null;
}

export function ResearchTab({ workId }: ResearchTabProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [providerStatus, setProviderStatus] = useState<Record<string, string> | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

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

  const handleSave = async (result: ResearchResult) => {
    // Generate a temporary ID for tracking saving state if DOI is missing
    const trackId = result.source.doi || result.source.title;
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
          // Already saved, just mark it
          setSavedIds(prev => new Set(prev).add(trackId));
          return;
        }
        throw new Error(data.error || 'Failed to save source');
      }
      
      setSavedIds(prev => new Set(prev).add(trackId));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingId(null);
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
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-foreground-muted">
            <Loader2 size={24} className="animate-spin mb-2" />
            <span className="text-[12px]">Searching scholarly providers...</span>
          </div>
        ) : results.length === 0 && !errorMsg ? (
          <div className="text-center py-8">
            <BookOpen size={24} className="mx-auto text-foreground-muted mb-3" />
            <p className="text-[13px] text-foreground-secondary mb-1">Enter a topic, keywords, or title.</p>
            <p className="text-[12px] text-foreground-muted">Searches Crossref and OpenAlex.</p>
          </div>
        ) : (
          results.map((r, idx) => {
            const trackId = r.source.doi || r.source.title;
            const isSaved = savedIds.has(trackId);
            const isSaving = savingId === trackId;
            const isExpanded = expandedId === trackId;

            return (
              <div key={idx} className="bg-white border border-border-light rounded p-3 shadow-sm text-[13px] flex flex-col gap-2">
                
                {/* Warnings */}
                {r.integrity.retraction === 'retracted' && (
                  <div className="bg-status-error/10 text-status-error font-bold p-1.5 rounded flex items-center gap-1.5 text-[12px]">
                    <ShieldAlert size={14} /> Warning: This paper has been retracted.
                  </div>
                )}

                <div>
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
                  <button
                    onClick={() => handleSave(r)}
                    disabled={isSaved || isSaving}
                    className={`h-7 px-3 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                      isSaved ? 'bg-status-success/10 text-status-success' : 'bg-accent text-white hover:bg-accent-hover'
                    }`}
                  >
                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : isSaved ? <CheckCircle size={12} /> : <Plus size={12} />}
                    {isSaving ? 'Saving...' : isSaved ? 'Saved to Library' : 'Save Source'}
                  </button>
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
                        <span className="font-semibold text-foreground-secondary block mb-1">Provenance</span>
                        <ul className="text-foreground-secondary list-disc pl-4">
                          {r.provenance.providers.map(p => <li key={p}>{p}</li>)}
                        </ul>
                      </div>
                      <div>
                        <span className="font-semibold text-foreground-secondary block mb-1">Open Access</span>
                        <div className="text-foreground-secondary">
                          Status: {renderStatus(r.integrity.access.status)}
                          {r.integrity.access.pdf_url && (
                            <a href={r.integrity.access.pdf_url} target="_blank" rel="noreferrer" className="block text-accent hover:underline mt-0.5 flex items-center gap-1">
                              View PDF <ExternalLink size={10} />
                            </a>
                          )}
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
