'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, FileText, CheckCircle, AlertCircle, Play } from 'lucide-react';
import { WritingAssistant } from '@/components/WritingAssistant';

interface Block {
  id: string;
  type: string;
  style: string;
  level?: number;
  text?: string;
  runs?: { text: string; bold: boolean; italic: boolean; }[];
}

interface DocumentData {
  id: string;
  title: string;
  original_filename: string;
  status: string;
  word_count: number;
  parsed_content: { sections: { blocks: Block[]; }[]; };
}

interface Suggestion {
  id: string;
  status: string;
  suggested_text: string;
  explanation: string;
}

interface Issue {
  id: string;
  document_id: string;
  block_id: string;
  status: string;
  original_text: string;
  explanation: string;
  issue_type: string;
  suggestions: Suggestion[];
}

export default function WorkspacePage({ params }: { params: { documentId: string } }) {
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  
  const supabase = createClient();

  const loadData = async () => {
    try {
      const { data: docData, error: dbError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', params.documentId)
        .single();
      if (dbError) throw dbError;
      setDoc(docData);

      const { data: issuesData, error: issuesError } = await supabase
        .from('writing_issues')
        .select(`*, suggestions(*)`)
        .eq('document_id', params.documentId);
        
      if (!issuesError && issuesData) {
        setIssues(issuesData);
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to load document';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.documentId]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: params.documentId })
      });
      if (res.ok) {
        await loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSuggestionAction = async (issueId: string, suggestionId: string, action: string, newText?: string) => {
    // Optimistic UI update
    setIssues(prev => prev.map(iss => {
      if (iss.id === issueId) {
        return {
          ...iss,
          status: action === 'rejected' ? 'rejected' : 'resolved',
          suggestions: iss.suggestions.map(s => 
            s.id === suggestionId ? { ...s, status: action, suggested_text: newText || s.suggested_text } : s
          )
        };
      }
      return iss;
    }));

    if (action !== 'rejected') setActiveIssueId(null);

    // Backend update
    await supabase.from('suggestions').update({ 
      status: action, 
      ...(newText ? { suggested_text: newText } : {}) 
    }).eq('id', suggestionId);
    
    await supabase.from('writing_issues').update({ 
      status: action === 'rejected' ? 'rejected' : 'resolved' 
    }).eq('id', issueId);
  };

  if (loading) return <div className="flex h-full items-center justify-center bg-[#F6F8FB]"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>;
  if (error || !doc || !doc.parsed_content) return <div className="p-8 text-center text-status-error bg-[#F6F8FB] h-full">Error loading document.</div>;

  const blocks = doc.parsed_content.sections?.[0]?.blocks || [];
  const headings = blocks.filter(b => b.type === 'heading');

  const activeIssue = issues.find(i => i.id === activeIssueId) || null;
  const activeBlock = activeIssue ? blocks.find(b => b.id === activeIssue.block_id) : null;
  
  const isAnalyzed = issues.length > 0 || doc.status === 'analyzed' || doc.status === 'ready';

  const renderTextWithHighlights = (block: Block) => {
    // Get issues for this block
    const blockIssues = issues.filter(i => i.block_id === block.id && i.status === 'open');
    const resolvedBlockIssues = issues.filter(i => i.block_id === block.id && i.status === 'resolved');
    
    let text = block.text || '';
    
    // For MVP, if there is a resolved issue, we just do a naive string replacement 
    resolvedBlockIssues.forEach(iss => {
      const acceptedSugg = iss.suggestions.find(s => s.status === 'accepted' || s.status === 'manually_edited');
      if (acceptedSugg && acceptedSugg.suggested_text) {
        text = text.replace(iss.original_text, acceptedSugg.suggested_text);
      }
    });

    if (blockIssues.length === 0) return <span>{text}</span>;

    // Simple highlight rendering for MVP: just split by the first open issue's original_text
    const issue = blockIssues[0];
    const parts = text.split(issue.original_text);
    
    if (parts.length < 2) return <span>{text}</span>;

    return (
      <>
        {parts[0]}
        <span 
          onClick={() => setActiveIssueId(issue.id)}
          className={`cursor-pointer transition-colors ${
            activeIssueId === issue.id 
              ? 'bg-[#FEF0C7] rounded px-0.5' // Soft amber background
              : 'bg-accent/10 border-b border-accent/30 hover:bg-accent/20' // Subtle unselected
          }`}
        >
          {issue.original_text}
        </span>
        {parts.slice(1).join(issue.original_text)}
      </>
    );
  };

  const renderStatusIcon = (status: string) => {
    switch(status) {
      case 'processing':
      case 'analyzing':
        return <Loader2 size={16} className="text-accent animate-spin" />;
      case 'ready':
      case 'analyzed':
        return <CheckCircle size={16} className="text-status-success" />;
      case 'failed':
        return <AlertCircle size={16} className="text-status-error" />;
      default:
        return <FileText size={16} className="text-foreground-secondary" />;
    }
  };

  return (
    <div className="flex h-full bg-[#F6F8FB] overflow-hidden relative">
      {/* 2. Left Panel: Document Navigation */}
      <aside className="w-[260px] bg-[#F6F8FB] border-r border-border-light flex flex-col shrink-0 overflow-y-auto hidden lg:flex">
        <div className="p-5 border-b border-border-light">
          <h2 className="text-[14px] font-semibold text-[#0B1628] mb-1 truncate">{doc.title}</h2>
          <div className="flex items-center text-[12px] text-foreground-secondary gap-2">
            {renderStatusIcon(doc.status)}
            <span className="capitalize">{doc.status}</span>
            <span>&middot;</span>
            <span>{doc.word_count ? doc.word_count.toLocaleString() : '0'} words</span>
          </div>
        </div>
        
        <div className="p-5 flex-1">
          <h3 className="text-[11px] font-semibold text-foreground-muted mb-3 uppercase tracking-wider">Outline</h3>
          {headings.length > 0 ? (
            <nav className="space-y-1">
              {headings.map(h => (
                <button
                  key={h.id}
                  onClick={() => document.getElementById(`block-${h.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="block w-full text-left px-2 py-1.5 text-[13px] rounded hover:bg-background-secondary text-foreground-secondary hover:text-[#0B1628] truncate transition-colors"
                  style={{ paddingLeft: `${((h.level || 1) - 1) * 0.75 + 0.5}rem` }}
                >
                  {h.text}
                </button>
              ))}
            </nav>
          ) : (
            <p className="text-[13px] text-foreground-secondary">No headings found in this document.</p>
          )}
        </div>
      </aside>

      {/* 3. Center Panel: Document Canvas */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F6F8FB] relative">
        {/* Document Toolbar (Sticky Header) */}
        <header className="h-[56px] bg-white border-b border-border-light flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
          <div className="flex items-center space-x-3 min-w-0">
            <FileText size={18} className="text-accent shrink-0" />
            <h1 className="text-[15px] font-semibold text-[#0B1628] truncate">{doc.original_filename || `${doc.title}.docx`}</h1>
            <span className="text-[13px] text-foreground-secondary shrink-0 hidden sm:inline-block border-l border-border-light pl-3 ml-3">
              {doc.word_count?.toLocaleString()} words
            </span>
          </div>
          <div className="flex items-center shrink-0 ml-4">
            <button 
              onClick={handleAnalyze} 
              disabled={analyzing}
              className="h-[32px] px-4 inline-flex items-center justify-center bg-accent text-white font-medium rounded-md hover:bg-accent-hover transition-colors text-[13px] disabled:opacity-50"
            >
              {analyzing ? <Loader2 size={14} className="animate-spin mr-2" /> : <Play size={14} className="mr-2 fill-current" />}
              Analyze Document
            </button>
          </div>
        </header>

        {/* Scrollable Document Area */}
        <div className="flex-1 overflow-y-auto px-4 py-8 md:px-12 md:py-12 flex justify-center scroll-smooth">
          <div className="w-full max-w-[820px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-border-light p-10 sm:p-16 md:p-24 pb-32">
            <div className="space-y-4">
              {blocks.map(block => {
                if (block.type === 'heading') {
                  const HeaderTag = `h${Math.min(block.level || 1, 6)}` as keyof JSX.IntrinsicElements;
                  const sizeClass = block.level === 1 ? 'text-[24px] font-bold mt-8 mb-4 text-[#0B1628]' : block.level === 2 ? 'text-[20px] font-semibold mt-6 mb-3 text-[#0B1628]' : 'text-[16px] font-semibold mt-4 mb-2 text-[#0B1628]';
                  return <HeaderTag key={block.id} id={`block-${block.id}`} className={sizeClass}>{block.text}</HeaderTag>;
                }
                return (
                  <p key={block.id} id={`block-${block.id}`} className={`text-[15px] leading-[1.7] transition-colors duration-300 ${activeIssue?.block_id === block.id ? 'text-[#0B1628]' : 'text-[#334155]'}`}>
                    {renderTextWithHighlights(block)}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Right Panel: Writing Assistant */}
      <aside className="w-[320px] bg-white border-l border-border-light shrink-0 hidden md:block overflow-y-auto h-full">
        <WritingAssistant 
          documentId={params.documentId}
          blockId={activeIssue?.block_id || ''}
          paragraphText={activeBlock?.text || ''}
          issue={activeIssue}
          onClose={() => setActiveIssueId(null)}
          onSuggestionAction={handleSuggestionAction}
          isAnalyzed={isAnalyzed}
          isAnalyzing={analyzing}
          onAnalyze={handleAnalyze}
        />
      </aside>
    </div>
  );
}
