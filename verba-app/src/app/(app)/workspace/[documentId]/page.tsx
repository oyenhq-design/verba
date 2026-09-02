'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
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
  parsed_content: { sections: { blocks: Block[]; }[]; };
}

export default function WorkspacePage({ params }: { params: { documentId: string } }) {
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

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
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
          suggestions: iss.suggestions.map((s: any) => 
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

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>;
  if (error || !doc || !doc.parsed_content) return <div className="p-8 text-center text-status-error">Error loading document.</div>;

  const blocks = doc.parsed_content.sections?.[0]?.blocks || [];
  const headings = blocks.filter(b => b.type === 'heading');

  const pendingIssues = issues.filter(i => i.status === 'open');
  const resolvedIssues = issues.filter(i => i.status === 'resolved');
  const rejectedIssues = issues.filter(i => i.status === 'rejected');
  
  const activeIssue = issues.find(i => i.id === activeIssueId) || null;
  const activeBlock = activeIssue ? blocks.find(b => b.id === activeIssue.block_id) : null;

  const renderTextWithHighlights = (block: Block) => {
    // Get issues for this block
    const blockIssues = issues.filter(i => i.block_id === block.id && i.status === 'open');
    const resolvedBlockIssues = issues.filter(i => i.block_id === block.id && i.status === 'resolved');
    
    let text = block.text || '';
    
    // For MVP, if there is a resolved issue, we just do a naive string replacement 
    // (In reality, we should apply it based on offsets to avoid multi-match bugs)
    resolvedBlockIssues.forEach(iss => {
      const acceptedSugg = iss.suggestions.find((s:any) => s.status === 'accepted' || s.status === 'manually_edited');
      if (acceptedSugg) {
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
          className={`cursor-pointer rounded border-b-2 transition-colors ${
            activeIssueId === issue.id 
              ? 'bg-[#FEF0C7] border-[#F59E0B]' 
              : 'bg-transparent border-[#F59E0B] hover:bg-[#FEF0C7]/50'
          }`}
        >
          {issue.original_text}
        </span>
        {parts.slice(1).join(issue.original_text)}
      </>
    );
  };

  return (
    <div className="flex h-full bg-background-pale overflow-hidden">
      {/* Left Panel: Outline & Stats */}
      <aside className="w-[260px] bg-white border-r border-border-light flex flex-col shrink-0">
        <div className="p-6 border-b border-border-light">
          <h3 className="text-[14px] font-semibold text-ink-secondary mb-4 uppercase tracking-wider">Writing Review</h3>
          {issues.length === 0 ? (
            <button 
              onClick={handleAnalyze} disabled={analyzing}
              className="w-full h-[36px] flex items-center justify-center space-x-2 bg-accent text-white rounded-md hover:bg-accent-hover transition-colors text-[13px] font-medium disabled:opacity-50"
            >
              {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span>Analyze Document</span>
            </button>
          ) : (
            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between items-center text-ink font-medium">
                <span>Suggestions</span>
                <span className="bg-background-secondary px-2 py-0.5 rounded-full">{issues.length}</span>
              </div>
              <div className="flex justify-between items-center text-status-success">
                <span>Accepted</span>
                <span>{resolvedIssues.length}</span>
              </div>
              <div className="flex justify-between items-center text-foreground-secondary">
                <span>Pending</span>
                <span>{pendingIssues.length}</span>
              </div>
              <div className="flex justify-between items-center text-foreground-muted">
                <span>Rejected</span>
                <span>{rejectedIssues.length}</span>
              </div>
            </div>
          )}
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <h3 className="text-[14px] font-semibold text-ink-secondary mb-4 uppercase tracking-wider">Outline</h3>
          <nav className="space-y-1">
            {headings.map(h => (
              <button
                key={h.id}
                onClick={() => document.getElementById(`block-${h.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="block w-full text-left px-2 py-1.5 text-[13px] rounded-md hover:bg-background-secondary text-foreground-secondary hover:text-ink truncate"
                style={{ paddingLeft: `${(h.level || 1) * 0.75}rem` }}
              >
                {h.text}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Center Panel: Canvas */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center scroll-smooth">
        <div className="w-full max-w-[750px] bg-white min-h-[1056px] shadow-sm border border-border-light rounded-sm p-16 pb-32">
          <h1 className="text-[28px] font-bold text-ink mb-12 text-center border-b border-border-light pb-4">{doc.title}</h1>
          <div className="space-y-4">
            {blocks.map(block => {
              if (block.type === 'heading') {
                const HeaderTag = `h${Math.min(block.level || 1, 6)}` as keyof JSX.IntrinsicElements;
                const sizeClass = block.level === 1 ? 'text-[24px] font-bold mt-8 mb-4 text-ink' : block.level === 2 ? 'text-[20px] font-semibold mt-6 mb-3 text-ink' : 'text-[16px] font-semibold mt-4 mb-2 text-ink';
                return <HeaderTag key={block.id} id={`block-${block.id}`} className={sizeClass}>{block.text}</HeaderTag>;
              }
              return (
                <p key={block.id} id={`block-${block.id}`} className={`text-[15px] leading-relaxed transition-colors duration-300 ${activeIssue?.block_id === block.id ? 'text-ink' : 'text-ink-secondary'}`}>
                  {renderTextWithHighlights(block)}
                </p>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Panel: Writing Assistant */}
      <aside className="w-[320px] bg-background-pale border-l border-border-light shrink-0">
        <WritingAssistant 
          documentId={params.documentId}
          blockId={activeIssue?.block_id || ''}
          paragraphText={activeBlock?.text || ''}
          issue={activeIssue}
          onClose={() => setActiveIssueId(null)}
          onSuggestionAction={handleSuggestionAction}
        />
      </aside>
    </div>
  );
}
