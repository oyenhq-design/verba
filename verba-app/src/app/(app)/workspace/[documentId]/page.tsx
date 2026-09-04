'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Loader2, FileText, CheckCircle, AlertCircle, Play,
  Maximize, Minimize, List as ListIcon,
  PanelRightClose, PanelRightOpen, ChevronDown, CloudOff, Cloud,
} from 'lucide-react';
import { WritingAssistant } from '@/components/WritingAssistant';
import { DocumentEditor } from '@/components/DocumentEditor';
import { Editor } from '@tiptap/react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Block {
  id: string;
  type: string;
  style: string;
  level?: number;
  text?: string;
  runs?: { text: string; bold: boolean; italic: boolean }[];
}

interface DocumentData {
  id: string;
  title: string;
  original_filename: string;
  status: string;
  word_count: number;
  parsed_content: { sections: { blocks: Block[] }[] };
  editor_state: Record<string, unknown> | null;
  editor_version: number;
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
  start_offset: number;
  end_offset: number;
  issue_type: string;
  suggestions: Suggestion[];
}

// ─── Save State Machine ───────────────────────────────────────────────────────
type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'failed';

// ─── Word count helper ────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function countWordsFromTiptapJson(json: Record<string, any>): number {
  let count = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walk = (node: Record<string, any>) => {
    if (node.type === 'text' && typeof node.text === 'string') {
      const words = node.text.trim().split(/\s+/).filter((w: string) => w.length > 0);
      count += words.length;
    }
    if (Array.isArray(node.content)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      node.content.forEach((child: Record<string, any>) => walk(child));
    }
  };
  walk(json);
  return count;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkspacePage({ params }: { params: { documentId: string } }) {
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Live word count (updated from editor on every save)
  const [liveWordCount, setLiveWordCount] = useState<number | null>(null);

  // Save state machine
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  // Track the current DB version so we can do stale-write protection
  const versionRef = useRef<number>(0);

  // Workspace Layout State
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showZoomMenu, setShowZoomMenu] = useState(false);

  const editorRef = useRef<Editor | null>(null);
  // Pending autosave timeout handle
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Whether there is an in-flight save request
  const savingRef = useRef(false);
  // The latest JSON that needs to be saved (may differ from what's in-flight)
  const pendingJsonRef = useRef<Record<string, unknown> | null>(null);

  const supabase = createClient();

  // ─── Load document + issues ─────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const { data: docData, error: dbError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', params.documentId)
        .single();
      if (dbError) throw dbError;
      setDoc(docData);
      versionRef.current = docData.editor_version ?? 0;
      setLiveWordCount(docData.word_count ?? null);

      const { data: issuesData, error: issuesError } = await supabase
        .from('writing_issues')
        .select('*, suggestions(*)')
        .eq('document_id', params.documentId);

      if (!issuesError && issuesData) {
        setIssues(issuesData);
        if (issuesData.length > 0) setIsAssistantOpen(true);
      }
    } catch (err: unknown) {
      console.error('[loadData]', err);
      const msg = err instanceof Error ? err.message : 'Failed to load document';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [params.documentId, supabase]);

  useEffect(() => {
    loadData();

    // Load editor preferences from localStorage
    const savedZoom = localStorage.getItem('verba_editor_zoom');
    if (savedZoom) setZoomLevel(parseInt(savedZoom, 10));

    const savedOutline = localStorage.getItem('verba_editor_outline');
    if (savedOutline !== null) setIsOutlineOpen(savedOutline === 'true');

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.documentId]);

  // Focus mode keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) setIsFocusMode(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  // ─── Autosave ─────────────────────────────────────────────────────────────

  /**
   * Perform the actual network save.
   * Uses the version currently in versionRef for stale-write protection.
   * Safe to call while another save is completing — latest JSON always wins.
   */
  const performSave = useCallback(async (json: Record<string, unknown>) => {
    if (savingRef.current) {
      // A save is already in-flight. Store the latest JSON and let the
      // completion handler re-trigger a save if needed.
      pendingJsonRef.current = json;
      return;
    }

    savingRef.current = true;
    setSaveStatus('saving');

    const wordCount = countWordsFromTiptapJson(json);
    const expectedVersion = versionRef.current;

    try {
      const res = await fetch(`/api/documents/${params.documentId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editorState: json,
          wordCount,
          expectedVersion,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        versionRef.current = data.newVersion;
        setLiveWordCount(wordCount);
        setSaveStatus('saved');
      } else if (res.status === 409 && data.stale) {
        // Our save was stale — a newer one already succeeded.
        // Update our version baseline and do not show an error.
        versionRef.current = data.currentVersion;
        setSaveStatus('saved');
      } else {
        console.error('[save] Server error:', data);
        setSaveStatus('failed');
      }
    } catch (err) {
      console.error('[save] Network error:', err);
      setSaveStatus('failed');
    } finally {
      savingRef.current = false;

      // If newer content arrived while we were saving, save that too
      if (pendingJsonRef.current) {
        const nextJson = pendingJsonRef.current;
        pendingJsonRef.current = null;
        // Small delay to avoid tight retry loops on failure
        setTimeout(() => performSave(nextJson), 200);
      }
    }
  }, [params.documentId]);

  /**
   * Called by DocumentEditor on every document change.
   * Debounces at 1000ms and marks document dirty immediately.
   */
  const handleEditorUpdate = useCallback((json: Record<string, unknown>) => {
    // Mark dirty immediately so UI is truthful
    setSaveStatus('unsaved');

    // Clear any pending autosave timer
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    // Schedule debounced save
    autosaveTimerRef.current = setTimeout(() => {
      performSave(json);
    }, 1000);
  }, [performSave]);

  // Flush pending save before navigating away (best-effort)
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  // ─── Analysis ─────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!editorRef.current) return;
    setAnalyzing(true);
    setAnalyzeError(null);

    try {
      const json = editorRef.current.getJSON();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentBlocks = ((json.content || []) as any[])
        .filter((n: { type: string }) => n.type === 'paragraph' || n.type === 'heading')
        .map((n: { type: string; attrs?: { verbaBlockId?: string }; content?: { text?: string }[] }) => ({
          id: n.attrs?.verbaBlockId,
          type: n.type,
          text: (n.content || []).map((c: { text?: string }) => c.text || '').join(''),
        }))
        .filter((b: { id?: string; text: string }) => b.id && b.text.trim().length > 0);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: params.documentId, blocks: currentBlocks }),
      });

      const resData = await res.json();

      if (res.ok && resData.success) {
        await loadData();
        setIsAssistantOpen(true);
      } else {
        const failMsg = resData.message || 'Analysis failed. Please try again.';
        console.error('[handleAnalyze] Engine error:', resData.error, failMsg);
        setAnalyzeError(failMsg);
        setIsAssistantOpen(true);
      }
    } catch (e) {
      console.error('[handleAnalyze] Network error:', e);
      setAnalyzeError('Could not reach the analysis service. Please check your connection.');
      setIsAssistantOpen(true);
    } finally {
      setAnalyzing(false);
    }
  };

  // ─── Suggestion Actions ────────────────────────────────────────────────────

  const handleSuggestionAction = async (
    issueId: string,
    suggestionId: string,
    action: string,
    newText?: string
  ) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;

    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    if (action === 'accepted' || action === 'manually_edited') {
      const textToApply = newText || issue.suggestions.find(s => s.id === suggestionId)?.suggested_text;
      if (!textToApply) return;

      let blockStartPos = -1;
      let blockText = '';

      editor.state.doc.descendants((node, pos) => {
        if (node.attrs.verbaBlockId === issue.block_id) {
          blockStartPos = pos + 1;
          blockText = node.textContent;
          return false;
        }
      });

      if (blockStartPos !== -1) {
        const textSlice = blockText.substring(issue.start_offset, issue.end_offset);
        if (textSlice !== issue.original_text) {
          alert('This passage has changed since it was analyzed. The suggestion cannot be applied safely.');
          return;
        }
        const from = blockStartPos + issue.start_offset;
        const to = blockStartPos + issue.end_offset;
        editor.commands.insertContentAt({ from, to }, textToApply);
      } else {
        alert('The original paragraph was deleted or modified. The suggestion cannot be applied safely.');
        return;
      }
    }

    // Optimistic UI update
    setIssues(prev =>
      prev.map(iss => {
        if (iss.id !== issueId) return iss;
        return {
          ...iss,
          status: action === 'rejected' ? 'rejected' : 'resolved',
          suggestions: iss.suggestions.map(s =>
            s.id === suggestionId
              ? { ...s, status: action, suggested_text: newText || s.suggested_text }
              : s
          ),
        };
      })
    );

    if (action !== 'rejected') setActiveIssueId(null);

    await supabase
      .from('suggestions')
      .update({ status: action, ...(newText ? { suggested_text: newText } : {}) })
      .eq('id', suggestionId);

    await supabase
      .from('writing_issues')
      .update({ status: action === 'rejected' ? 'rejected' : 'resolved' })
      .eq('id', issueId);
  };

  const selectIssue = (id: string | null) => {
    setActiveIssueId(id);
    if (id) setIsAssistantOpen(true);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F6F8FB]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (error || !doc || !doc.parsed_content) {
    return (
      <div className="p-8 text-center text-status-error bg-[#F6F8FB] h-full">
        Error loading document.
      </div>
    );
  }

  const activeIssue = issues.find(i => i.id === activeIssueId) || null;

  let activeBlockText = '';
  if (editorRef.current && activeIssue) {
    editorRef.current.state.doc.descendants(node => {
      if (node.attrs.verbaBlockId === activeIssue.block_id) {
        activeBlockText = node.textContent;
        return false;
      }
    });
  }

  const isAnalyzed = issues.length > 0 || doc.status === 'analyzed' || doc.status === 'ready';
  const zoomOptions = [75, 90, 100, 110, 125, 150];

  // Determine initial content:
  // CASE A — editor_state exists → pass as Tiptap JSON
  // CASE B — editor_state is null → pass parsed_content blocks
  const initialEditorJson = doc.editor_state ?? null;
  const initialBlocks = doc.parsed_content.sections?.[0]?.blocks || [];

  // For the document outline, use whichever content is active
  // (simplified: pull headings from initialBlocks for outline panel)
  const outlineHeadings = initialBlocks.filter(b => b.type === 'heading');

  // Status badge
  const renderSaveBadge = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <div className="flex items-center text-[12px] text-foreground-secondary gap-1.5 px-2 py-0.5 bg-black/5 rounded-full">
            <Loader2 size={13} className="animate-spin text-accent" />
            <span>Saving…</span>
          </div>
        );
      case 'saved':
        return (
          <div className="flex items-center text-[12px] text-[#027A48] gap-1.5 px-2 py-0.5 bg-[#ECFDF3] rounded-full">
            <Cloud size={13} />
            <span>Saved</span>
          </div>
        );
      case 'unsaved':
        return (
          <div className="flex items-center text-[12px] text-foreground-secondary gap-1.5 px-2 py-0.5 bg-black/5 rounded-full">
            <CheckCircle size={13} className="text-foreground-muted" />
            <span>Unsaved changes</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center text-[12px] text-[#B42318] gap-1.5 px-2 py-0.5 bg-[#FEF3F2] rounded-full cursor-pointer"
            title="Click to retry save"
            onClick={() => {
              if (editorRef.current) performSave(editorRef.current.getJSON());
            }}
          >
            <CloudOff size={13} />
            <span>Save failed — click to retry</span>
          </div>
        );
    }
  };

  const renderDocStatus = (status: string) => {
    switch (status) {
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

  const displayWordCount = liveWordCount !== null ? liveWordCount : doc.word_count;

  return (
    <div className="flex h-full bg-[#F6F8FB] overflow-hidden relative">
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
            {outlineHeadings.length > 0 ? (
              <nav className="space-y-0.5">
                {outlineHeadings.map((h, i) => (
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
        <header className="h-[48px] bg-[#F6F8FB] border-b border-border-light flex items-center justify-between px-4 shrink-0 z-10">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {!isOutlineOpen && !isFocusMode && (
              <button onClick={() => setIsOutlineOpen(true)} className="text-foreground-muted hover:text-foreground p-1 mr-1">
                <PanelRightOpen size={16} className="rotate-180" />
              </button>
            )}
            <FileText size={18} className="text-accent shrink-0" />
            <h1 className="text-[14px] font-medium text-[#0B1628] truncate">
              {doc.original_filename || `${doc.title}.docx`}
            </h1>

            {/* Document parse status badge */}
            <div className="flex items-center text-[12px] text-foreground-secondary gap-1.5 px-2 py-0.5 bg-black/5 rounded-full">
              {renderDocStatus(doc.status)}
              <span className="capitalize">
                {doc.status === 'ready' ? 'Parsed' : doc.status}
              </span>
            </div>

            {/* Autosave status badge */}
            {renderSaveBadge()}
          </div>

          <div className="flex items-center shrink-0 space-x-2">
            <span className="text-[12px] text-foreground-secondary shrink-0 border-r border-border-light pr-3 mr-1">
              {(displayWordCount ?? 0).toLocaleString()} words
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

            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              className={`flex items-center justify-center p-1.5 rounded transition-colors ${isFocusMode ? 'bg-accent/10 text-accent' : 'text-foreground-secondary hover:bg-black/5'}`}
              title="Focus Mode (Esc to exit)"
            >
              {isFocusMode ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>

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
              {analyzing
                ? <Loader2 size={14} className="animate-spin mr-1.5" />
                : <Play size={14} className="mr-1.5 fill-current" />
              }
              Analyze
            </button>
          </div>
        </header>

        <DocumentEditor
          initialBlocks={initialEditorJson ? undefined : initialBlocks}
          initialEditorJson={initialEditorJson}
          isEditable={true}
          zoomLevel={zoomLevel}
          issues={issues}
          selectedIssueId={activeIssueId}
          onIssueSelect={selectIssue}
          onEditorReady={(editor) => { editorRef.current = editor; }}
          onUpdate={handleEditorUpdate}
        />
      </div>

      {/* 4. Right Panel: Writing Assistant */}
      {!isFocusMode && isAssistantOpen && (
        <aside className="w-[320px] bg-white border-l border-border-light shrink-0 flex flex-col h-full relative z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.02)] md:shadow-none">
          <div className="absolute top-2 right-2 z-10">
            <button
              onClick={() => setIsAssistantOpen(false)}
              className="p-1 text-foreground-muted hover:text-foreground hover:bg-black/5 rounded"
            >
              <PanelRightClose size={16} />
            </button>
          </div>
          <WritingAssistant
            documentId={params.documentId}
            blockId={activeIssue?.block_id || ''}
            paragraphText={activeBlockText}
            issue={activeIssue as unknown as typeof activeIssue}
            onClose={() => selectIssue(null)}
            onSuggestionAction={handleSuggestionAction as unknown as (...args: unknown[]) => void}
            isAnalyzed={isAnalyzed}
            isAnalyzing={analyzing}
            onAnalyze={handleAnalyze}
            issuesCount={issues.filter(i => i.status === 'open').length}
            docStatus={doc.status}
            analyzeError={analyzeError}
          />
        </aside>
      )}
    </div>
  );
}
