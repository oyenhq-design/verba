'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Loader2, FileText, CheckCircle, Play,
  Maximize, Minimize, List as ListIcon,
  PanelRightClose, PanelRightOpen, ChevronDown, CloudOff, Cloud, Save,
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
      count += node.text.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
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

  // Live word count (updated on every save)
  const [liveWordCount, setLiveWordCount] = useState<number | null>(null);

  // Autosave preference — null = still loading (prevents premature autosave)
  const [autosaveEnabled, setAutosaveEnabled] = useState<boolean | null>(null);

  // Save state machine
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const versionRef = useRef<number>(0);

  // Workspace Layout State
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showZoomMenu, setShowZoomMenu] = useState(false);

  const editorRef = useRef<Editor | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const pendingJsonRef = useRef<Record<string, unknown> | null>(null);
  // Ref so Ctrl+S handler always has fresh value without re-registering
  const autosaveEnabledRef = useRef<boolean | null>(null);
  const saveStatusRef = useRef<SaveStatus>('saved');

  useEffect(() => { autosaveEnabledRef.current = autosaveEnabled; }, [autosaveEnabled]);
  useEffect(() => { saveStatusRef.current = saveStatus; }, [saveStatus]);

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
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [params.documentId, supabase]);

  // ─── Bootstrap: load document + preferences in parallel ─────────────────

  useEffect(() => {
    const bootstrap = async () => {
      // Load layout prefs from localStorage
      try {
        const savedZoom = localStorage.getItem('verba_editor_zoom');
        if (savedZoom) setZoomLevel(parseInt(savedZoom, 10));
        const savedOutline = localStorage.getItem('verba_editor_outline');
        if (savedOutline !== null) setIsOutlineOpen(savedOutline === 'true');
      } catch {/* ignore */}

      // Load document and autosave preference concurrently.
      // autosaveEnabled stays null until the preference resolves —
      // this prevents any accidental autosave before the setting is known.
      await Promise.all([
        loadData(),
        fetch('/api/preferences')
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            const enabled = (data && typeof data.autosave_enabled === 'boolean')
              ? data.autosave_enabled
              : true; // default
            setAutosaveEnabled(enabled);
          })
          .catch(() => setAutosaveEnabled(true)), // default on network error
      ]);
    };

    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.documentId]);

  // Focus mode Esc shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) setIsFocusMode(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  // ─── beforeunload warning ────────────────────────────────────────────────

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatusRef.current === 'unsaved' || saveStatusRef.current === 'failed') {
        e.preventDefault();
        // Modern browsers show their own message; setting returnValue triggers the dialog
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ─── Core Save ────────────────────────────────────────────────────────────

  const performSave = useCallback(async (json: Record<string, unknown>) => {
    if (savingRef.current) {
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
        body: JSON.stringify({ editorState: json, wordCount, expectedVersion }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        versionRef.current = data.newVersion;
        setLiveWordCount(wordCount);
        setSaveStatus('saved');
      } else if (res.status === 409 && data.stale) {
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
      if (pendingJsonRef.current) {
        const nextJson = pendingJsonRef.current;
        pendingJsonRef.current = null;
        setTimeout(() => performSave(nextJson), 200);
      }
    }
  }, [params.documentId]);

  // ─── Manual save (button + Ctrl/Cmd+S) ───────────────────────────────────

  const triggerManualSave = useCallback(() => {
    if (!editorRef.current) return;
    // Cancel any pending debounce timer before saving immediately
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    performSave(editorRef.current.getJSON());
  }, [performSave]);

  // Keyboard shortcut: Ctrl/Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isSave = (e.ctrlKey || e.metaKey) && e.key === 's';
      if (!isSave) return;
      e.preventDefault(); // prevent browser Save Page dialog

      // Works in both autosave ON and OFF modes
      triggerManualSave();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerManualSave]);

  // ─── Editor onUpdate callback ─────────────────────────────────────────────

  const handleEditorUpdate = useCallback((json: Record<string, unknown>) => {
    // Mark dirty immediately
    setSaveStatus('unsaved');

    // Do not schedule autosave until preference is loaded or if it's off
    if (autosaveEnabledRef.current !== true) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => performSave(json), 1000);
  }, [performSave]);

  // ─── Autosave preference changes ─────────────────────────────────────────

  // When autosave is switched ON and there are unsaved changes → save now
  useEffect(() => {
    if (autosaveEnabled === true && saveStatusRef.current === 'unsaved' && editorRef.current) {
      performSave(editorRef.current.getJSON());
    }
    // When switched OFF → cancel pending debounce (in-flight saves complete normally)
    if (autosaveEnabled === false && autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, [autosaveEnabled, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
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
        editor.commands.insertContentAt(
          { from: blockStartPos + issue.start_offset, to: blockStartPos + issue.end_offset },
          textToApply
        );
      } else {
        alert('The original paragraph was deleted or modified. The suggestion cannot be applied safely.');
        return;
      }
    }

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
      
    // Log provenance event (fire and forget)
    if (action === 'accepted' || action === 'rejected') {
      fetch(`/api/documents/${params.documentId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: action === 'accepted' ? 'verba_suggestion_accepted' : 'verba_suggestion_rejected',
          metadata: {
            suggestion_id: suggestionId,
            issue_id: issueId
          }
        })
      }).catch(err => console.error('Failed to log suggestion event:', err));
    }
  };

  const selectIssue = (id: string | null) => {
    setActiveIssueId(id);
    if (id) setIsAssistantOpen(true);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  // Still loading document OR still loading preference — show spinner
  if (loading || autosaveEnabled === null) {
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

  const initialEditorJson = doc.editor_state ?? null;
  const initialBlocks = doc.parsed_content.sections?.[0]?.blocks || [];
  const outlineHeadings = initialBlocks.filter(b => b.type === 'heading');
  const displayWordCount = liveWordCount !== null ? liveWordCount : doc.word_count;

  // ── Save badge ────────────────────────────────────────────────────────────
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
          <button
            onClick={triggerManualSave}
            className="flex items-center text-[12px] text-[#B42318] gap-1.5 px-2 py-0.5 bg-[#FEF3F2] rounded-full cursor-pointer hover:bg-[#FEE4E2] transition-colors"
            title="Click to retry save"
          >
            <CloudOff size={13} />
            <span>Save failed — retry</span>
          </button>
        );
    }
  };

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
          <div className="flex items-center space-x-2 min-w-0 flex-1 overflow-hidden">
            {!isOutlineOpen && !isFocusMode && (
              <button onClick={() => setIsOutlineOpen(true)} className="text-foreground-muted hover:text-foreground p-1 shrink-0">
                <PanelRightOpen size={16} className="rotate-180" />
              </button>
            )}
            <FileText size={18} className="text-accent shrink-0" />
            <h1 className="text-[14px] font-medium text-[#0B1628] truncate min-w-0">
              {doc.original_filename || `${doc.title}.docx`}
            </h1>
            {renderSaveBadge()}
          </div>

          <div className="flex items-center shrink-0 space-x-2">
            <span className="text-[12px] text-foreground-secondary shrink-0 border-r border-border-light pr-3 mr-1">
              {(displayWordCount ?? 0).toLocaleString()} words
            </span>

            {/* Manual Save button — only shown when autosave is OFF */}
            {!autosaveEnabled && (
              <button
                id="manual-save-btn"
                onClick={triggerManualSave}
                disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                className={`h-[28px] px-3 inline-flex items-center gap-1.5 font-medium rounded text-[12px] transition-colors ${
                  saveStatus === 'unsaved' || saveStatus === 'failed'
                    ? 'bg-accent text-white hover:bg-accent-hover'
                    : 'bg-black/5 text-foreground-secondary cursor-default'
                } disabled:opacity-50`}
                title="Save document (Ctrl/Cmd+S)"
              >
                {saveStatus === 'saving'
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Save size={13} />
                }
                {saveStatus === 'saving' ? 'Saving…' : 'Save'}
              </button>
            )}

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
              <button onClick={() => setIsAssistantOpen(true)} className="text-foreground-muted hover:text-foreground p-1">
                <PanelRightOpen size={16} />
              </button>
            )}

            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="ml-1 h-[28px] px-3 inline-flex items-center justify-center bg-accent text-white font-medium rounded hover:bg-accent-hover transition-colors text-[12px] disabled:opacity-50"
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
