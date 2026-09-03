'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, FileText, CheckCircle, AlertCircle, Play, Maximize, Minimize, List as ListIcon, PanelRightClose, PanelRightOpen, ChevronDown } from 'lucide-react';
import { WritingAssistant } from '@/components/WritingAssistant';
import { DocumentEditor } from '@/components/DocumentEditor';

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
  
  // Workspace Layout State
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  
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
        if (issuesData.length > 0) setIsAssistantOpen(true);
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

  useEffect(() => {
    // Esc exits focus mode
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

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
        setIsAssistantOpen(true);
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

  const selectIssue = (id: string | null) => {
    setActiveIssueId(id);
    if (id) {
      setIsAssistantOpen(true);
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center bg-[#F6F8FB]"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>;
  if (error || !doc || !doc.parsed_content) return <div className="p-8 text-center text-status-error bg-[#F6F8FB] h-full">Error loading document.</div>;

  const blocks = doc.parsed_content.sections?.[0]?.blocks || [];
  const headings = blocks.filter(b => b.type === 'heading');

  const activeIssue = issues.find(i => i.id === activeIssueId) || null;
  const activeBlock = activeIssue ? blocks.find(b => b.id === activeIssue.block_id) : null;
  
  const isAnalyzed = issues.length > 0 || doc.status === 'analyzed' || doc.status === 'ready';

  const renderStatusIcon = (status: string) => {
    switch(status) {
      case 'processing':
      case 'analyzing':
        return <Loader2 size={14} className="text-accent animate-spin" />;
      case 'ready':
      case 'analyzed':
        return <CheckCircle size={14} className="text-status-success" />;
      case 'failed':
        return <AlertCircle size={14} className="text-status-error" />;
      default:
        return <FileText size={14} className="text-foreground-secondary" />;
    }
  };

  const zoomOptions = [75, 90, 100, 110, 125, 150];

  return (
    <div className="flex h-full bg-[#F6F8FB] overflow-hidden relative">
      {/* 1. App Sidebar Toggle via layout hierarchy - For this scope, the sidebar is handled in layout.tsx. 
          To hide the main sidebar in Focus Mode, we apply a global class to body or handle it in layout if it used context.
          Since layout.tsx doesn't know about focus mode natively, we'll use a CSS trick to hide the sidebar when focus mode is active.
      */}
      <style>{isFocusMode ? `
        aside.w-\\[260px\\].bg-white.border-r { display: none !important; }
      ` : ''}</style>

      {/* 2. Left Panel: Document Outline */}
      {!isFocusMode && isOutlineOpen && (
        <aside className="w-[200px] bg-[#F6F8FB] border-r border-border-light flex flex-col shrink-0 overflow-y-auto hidden lg:flex">
          <div className="p-4 border-b border-border-light flex items-center justify-between sticky top-0 bg-[#F6F8FB] z-10">
            <h3 className="text-[11px] font-semibold text-foreground-muted uppercase tracking-wider flex items-center">
              <ListIcon size={14} className="mr-2" />
              Outline
            </h3>
            <button onClick={() => setIsOutlineOpen(false)} className="text-foreground-muted hover:text-foreground">
              <PanelRightClose size={14} className="rotate-180" />
            </button>
          </div>
          
          <div className="p-3 flex-1">
            {headings.length > 0 ? (
              <nav className="space-y-0.5">
                {headings.map((h, i) => (
                  <button
                    key={h.id || i}
                    className="block w-full text-left px-2 py-1 text-[13px] rounded hover:bg-black/5 text-foreground-secondary hover:text-[#0B1628] truncate transition-colors"
                    style={{ paddingLeft: `${((h.level || 1) - 1) * 0.75 + 0.5}rem` }}
                  >
                    {h.text}
                  </button>
                ))}
              </nav>
            ) : (
              <p className="text-[13px] text-foreground-secondary px-2 mt-2">No headings found.</p>
            )}
          </div>
        </aside>
      )}

      {/* 3. Center Panel: Document Canvas */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F6F8FB] relative">
        {/* Document Toolbar (Sticky Header) */}
        <header className="h-[48px] bg-[#F6F8FB] border-b border-border-light flex items-center justify-between px-4 shrink-0 z-10">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {!isOutlineOpen && !isFocusMode && (
              <button onClick={() => setIsOutlineOpen(true)} className="text-foreground-muted hover:text-foreground p-1 mr-1">
                <PanelRightOpen size={16} className="rotate-180" />
              </button>
            )}
            <FileText size={18} className="text-accent shrink-0" />
            <h1 className="text-[14px] font-medium text-[#0B1628] truncate">{doc.original_filename || `${doc.title}.docx`}</h1>
            <div className="flex items-center text-[12px] text-foreground-secondary gap-1.5 px-2 py-0.5 bg-black/5 rounded-full">
              {renderStatusIcon(doc.status)}
              <span className="capitalize">{doc.status === 'ready' ? 'Saved' : doc.status}</span>
            </div>
          </div>
          
          <div className="flex items-center shrink-0 space-x-2">
            <span className="text-[12px] text-foreground-secondary shrink-0 border-r border-border-light pr-3 mr-1">
              {doc.word_count?.toLocaleString()} words
            </span>

            {/* Zoom Control */}
            <div className="relative">
              <button 
                onClick={() => setShowZoomMenu(!showZoomMenu)}
                className="flex items-center space-x-1 text-[12px] text-foreground-secondary hover:bg-black/5 px-2 py-1 rounded transition-colors"
              >
                <span>{zoomLevel === 0 ? 'Fit Width' : `${zoomLevel}%`}</span>
                <ChevronDown size={14} />
              </button>
              {showZoomMenu && (
                <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-border-light shadow-lg rounded-md py-1 z-50">
                  {zoomOptions.map(z => (
                    <button 
                      key={z} 
                      onClick={() => { setZoomLevel(z); setShowZoomMenu(false); }}
                      className="block w-full text-left px-4 py-1.5 text-[12px] hover:bg-background-secondary"
                    >
                      {z}%
                    </button>
                  ))}
                  <div className="border-t border-border-light my-1" />
                  <button 
                    onClick={() => { setZoomLevel(0); setShowZoomMenu(false); }}
                    className="block w-full text-left px-4 py-1.5 text-[12px] hover:bg-background-secondary"
                  >
                    Fit Width
                  </button>
                </div>
              )}
            </div>

            {/* Focus Mode */}
            <button 
              onClick={() => setIsFocusMode(!isFocusMode)}
              className={`flex items-center justify-center p-1.5 rounded transition-colors ${isFocusMode ? 'bg-accent/10 text-accent' : 'text-foreground-secondary hover:bg-black/5'}`}
              title="Focus Mode (Esc to exit)"
            >
              {isFocusMode ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>

            {/* Assistant Toggle */}
            {!isFocusMode && !isAssistantOpen && (
              <button onClick={() => setIsAssistantOpen(true)} className="text-foreground-muted hover:text-foreground p-1 ml-1">
                <PanelRightOpen size={16} />
              </button>
            )}

            <button 
              onClick={handleAnalyze} 
              disabled={analyzing}
              className="ml-2 h-[28px] px-3 inline-flex items-center justify-center bg-accent text-white font-medium rounded hover:bg-accent-hover transition-colors text-[12px] disabled:opacity-50"
            >
              {analyzing ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Play size={14} className="mr-1.5 fill-current" />}
              Analyze
            </button>
          </div>
        </header>

        {/* Tiptap Document Editor Area */}
        <DocumentEditor initialBlocks={blocks} isEditable={true} zoomLevel={zoomLevel} />
      </div>

      {/* 4. Right Panel: Writing Assistant */}
      {!isFocusMode && isAssistantOpen && (
        <aside className="w-[320px] bg-white border-l border-border-light shrink-0 flex flex-col h-full relative z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.02)] md:shadow-none">
          <div className="absolute top-2 right-2 z-10">
            <button onClick={() => setIsAssistantOpen(false)} className="p-1 text-foreground-muted hover:text-foreground hover:bg-black/5 rounded">
              <PanelRightClose size={16} />
            </button>
          </div>
          <WritingAssistant 
            documentId={params.documentId}
            blockId={activeIssue?.block_id || ''}
            paragraphText={activeBlock?.text || ''}
            issue={activeIssue}
            onClose={() => selectIssue(null)}
            onSuggestionAction={handleSuggestionAction}
            isAnalyzed={isAnalyzed}
            isAnalyzing={analyzing}
            onAnalyze={handleAnalyze}
          />
        </aside>
      )}
    </div>
  );
}
