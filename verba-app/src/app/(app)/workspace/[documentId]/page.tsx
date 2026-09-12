'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Loader2, FileText, CheckCircle,
  Maximize, Minimize, List as ListIcon,
  PanelRightClose, PanelRightOpen, ChevronDown, CloudOff, Cloud, Save, Sparkles
} from 'lucide-react';
import { VerbaWorkspace } from '@/components/workspace/VerbaWorkspace';
import { DocumentEditor, ContextualSelection } from '@/components/DocumentEditor';
import { Editor } from '@tiptap/react';
import { CitationProvider } from '@/components/workspace/CitationContext';
import { buildReplaceCitationCommand, buildAddSupportingCitationCommand } from '@/lib/citations/replace';
import { BibliographyPreview } from '@/components/workspace/BibliographyPreview';

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
  work_id: string | null;
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

function extractCitationsFromTiptapJson(json: Record<string, unknown> | null): { citationId: string; sourceId: string }[] {
  if (!json) return [];
  const citations: { citationId: string; sourceId: string }[] = [];
  const walk = (node: Record<string, any>) => {
    if (node.type === 'citation' && node.attrs?.citationId && node.attrs?.sourceId) {
      citations.push({ citationId: node.attrs.citationId, sourceId: node.attrs.sourceId });
    }
    if (Array.isArray(node.content)) {
      node.content.forEach((child: Record<string, any>) => walk(child));
    }
  };
  walk(json);
  return citations;
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

  // Contextual Assistant
  const [contextualSelection, setContextualSelection] = useState<ContextualSelection | null>(null);
  const [evidenceSelection, setEvidenceSelection] = useState<ContextualSelection | null>(null);

  // Citation Data
  const [sources, setSources] = useState<any[]>([]);
  const [citationStyle, setCitationStyle] = useState<'apa' | 'ieee'>('apa');
  const [documentCitations, setDocumentCitations] = useState<{ citationId: string; sourceId: string }[]>([]);
  const [projectContext, setProjectContext] = useState<Record<string, unknown> | undefined>(undefined);

  // Live word count (updated on every save)
  const [liveWordCount, setLiveWordCount] = useState<number | null>(null);

  // Editor Focus State for Citation insertion
  const [editorHasFocus, setEditorHasFocus] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Autosave preference — null = still loading (prevents premature autosave)
  const [autosaveEnabled, setAutosaveEnabled] = useState<boolean | null>(null);

  // Save state machine
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const versionRef = useRef<number>(0);

  // Workspace Layout State
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<'assistant' | 'review' | 'research' | 'cite' | 'integrity' | 'prove'>('assistant');
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

      // Legacy Document Adoption
      if (!docData.work_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: newWorkId, error: adoptError } = await supabase.rpc('adopt_document_into_work', {
            p_document_id: docData.id
          });
          if (!adoptError && newWorkId) {
            docData.work_id = newWorkId;
          } else if (adoptError) {
            console.error('[loadData] Failed to adopt legacy document:', adoptError);
          }
        }
      }

      setDoc(docData);
      versionRef.current = docData.editor_version ?? 0;
      setLiveWordCount(docData.word_count ?? null);
      if (docData.editor_state) {
        setDocumentCitations(extractCitationsFromTiptapJson(docData.editor_state as any));
      }

      const { data: issuesData, error: issuesError } = await supabase
        .from('writing_issues')
        .select('*, suggestions(*)')
        .eq('document_id', params.documentId);

      if (!issuesError && issuesData) {
        setIssues(issuesData);
        if (issuesData.length > 0) setIsWorkspaceOpen(true);
      }

      // Fetch Citation Data if connected to a Work
      if (docData.work_id) {
        // Fetch Work to get citation_style from context
        const { data: workData } = await supabase
          .from('works')
          .select('context')
          .eq('id', docData.work_id)
          .single();
        
        if (workData?.context) {
          setProjectContext(workData.context);
          if (workData.context.citation_style) {
            setCitationStyle(workData.context.citation_style);
          }
        }

        // Fetch Work Sources
        const { data: sourcesData } = await supabase
          .from('work_sources')
          .select('*')
          .eq('work_id', docData.work_id)
          .order('created_at', { ascending: false });
        
        if (sourcesData) {
          setSources(sourcesData);
        }
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
    setDocumentCitations(extractCitationsFromTiptapJson(json));

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

  // ─── Refresh sources after Research saves a new source ──────────────────
  // NOTE: must live here, before any early returns, to satisfy Rules of Hooks.
  // doc may be null on first render; the callback guards with doc?.work_id.
  const refreshSources = useCallback(async (newSource?: any) => {
    if (!doc?.work_id) return;
    if (newSource) {
      // Optimistic: prepend the returned row immediately
      setSources(prev => [newSource, ...prev]);
      return;
    }
    // Fallback: full refetch
    const { data } = await supabase
      .from('work_sources')
      .select('*')
      .eq('work_id', doc.work_id)
      .order('created_at', { ascending: false });
    if (data) setSources(data);
  }, [doc?.work_id, supabase]);

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
        setIsWorkspaceOpen(true);
      } else {
        const failMsg = resData.message || 'Analysis failed. Please try again.';
        console.error('[handleAnalyze] Engine error:', resData.error, failMsg);
        setAnalyzeError(failMsg);
        setIsWorkspaceOpen(true);
      }
    } catch (e) {
      console.error('[handleAnalyze] Network error:', e);
      setAnalyzeError('Could not reach the analysis service. Please check your connection.');
      setIsWorkspaceOpen(true);
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
    if (id) setIsWorkspaceOpen(true);
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
    <>
    <CitationProvider sources={sources} style={citationStyle} documentCitations={documentCitations}>
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

          <div className="flex items-center shrink-0 space-x-3">
            <span className="text-[12px] text-foreground-secondary shrink-0 border-r border-border-light pr-3">
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

            <div className="w-[1px] h-4 bg-border-light mx-1" />

            <button
              onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
              className={`flex items-center space-x-1.5 px-3 h-[28px] text-[12px] font-medium border rounded transition-colors ${
                isWorkspaceOpen 
                  ? 'bg-accent/10 border-accent/20 text-accent' 
                  : 'bg-white border-border-light text-[#0B1628] hover:bg-background-secondary'
              }`}
            >
              <Sparkles size={14} className={isWorkspaceOpen ? 'text-accent' : 'text-accent'} />
              <span>Verba Workspace</span>
              <ChevronDown size={14} className={`ml-1 transition-transform ${isWorkspaceOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </header>

          <div className="flex-1 overflow-y-auto">
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
              onFocus={() => setEditorHasFocus(true)}
              onBlur={() => setEditorHasFocus(false)}
              onAskVerba={(sel) => {
                setContextualSelection(sel);
                setIsWorkspaceOpen(true);
                setWorkspaceTab('assistant');
                setActiveIssueId(null);
                setEvidenceSelection(null);
              }}
              onFindEvidence={(sel) => {
                setEvidenceSelection(sel);
                setIsWorkspaceOpen(true);
                setWorkspaceTab('research');
                setActiveIssueId(null);
                setContextualSelection(null);
              }}
            />
            <BibliographyPreview />
          </div>
      </div>

      {/* 4. Right Panel: Verba Workspace */}
      {!isFocusMode && isWorkspaceOpen && (
        <VerbaWorkspace
          documentId={params.documentId}
          onClose={() => setIsWorkspaceOpen(false)}
          activeTab={workspaceTab}
          onTabChange={setWorkspaceTab}
          blockId={activeIssue?.block_id || contextualSelection?.blockId || evidenceSelection?.blockId || ''}
          paragraphText={activeBlockText || contextualSelection?.paragraphText || evidenceSelection?.paragraphText || ''}
          issues={issues}
          issue={activeIssue as unknown as typeof activeIssue}
          contextualSelection={contextualSelection}
          onClearContextualSelection={() => setContextualSelection(null)}
          evidenceSelection={evidenceSelection}
          onClearEvidenceSelection={() => setEvidenceSelection(null)}
          onIssueSelect={(id) => {
            selectIssue(id);
            if (id) setContextualSelection(null);
          }}
          onCloseIssue={() => {
            selectIssue(null);
            setContextualSelection(null);
          }}
          onSuggestionAction={handleSuggestionAction as unknown as (...args: unknown[]) => void}
          isAnalyzed={isAnalyzed}
          isAnalyzing={analyzing}
          onAnalyze={handleAnalyze}
          issuesCount={issues.filter(i => i.status === 'open').length}
          docStatus={doc.status}
          analyzeError={analyzeError}
          onIssueCreated={async (issueId) => {
            await loadData();
            selectIssue(issueId);
          }}
          workId={doc.work_id || null}
          projectContext={projectContext}
          editorHasFocus={editorHasFocus}
          onSourceSaved={refreshSources}
          onInsertCitation={async (sourceId) => {
            if (!editorRef.current) return;
            const editor = editorRef.current;
            try {
              const res = await fetch(`/api/documents/${params.documentId}/citations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ work_source_id: sourceId })
              });
              
              // Read body once — covers both success and error
              const data = await res.json();

              if (!res.ok) {
                throw new Error(data.error || data.message || 'Failed to insert citation');
              }
              
              const { citationId } = data;
              
              const { from, to } = editor.state.selection;
              editor.commands.insertContentAt(to, {
                type: 'citation',
                attrs: { citationId, sourceId }
              });
              
              editor.commands.insertContentAt(to + 1, ' ');
              
              fetch(`/api/documents/${params.documentId}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  event_type: 'citation_inserted',
                  metadata: {
                    citation_id: citationId,
                    source_id: sourceId
                  }
                })
              }).catch(err => console.error('Failed to log citation_inserted event:', err));
              
            } catch (err: any) {
              alert(err.message);
            }
          }}
          onReplaceCitation={async (oldCitationId: string, candidateSource: any) => {
            if (!editorRef.current || !doc?.work_id) return;
            const editor = editorRef.current;
            try {
              // Step 1: Save candidate source or reuse existing
              let finalSourceId: string;
              const saveRes = await fetch(`/api/works/${doc.work_id}/sources`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(candidateSource),
              });
              const saveData = await saveRes.json();

              if (saveRes.status === 409 && saveData.sourceId) {
                // Source already exists — reuse
                finalSourceId = saveData.sourceId;
              } else if (!saveRes.ok) {
                throw new Error(saveData.error || 'Failed to save source');
              } else {
                finalSourceId = saveData.id;
                // Optimistic update sources list
                refreshSources(saveData);
              }

              // Step 2: Create new document_citations row → get new citationId
              const citRes = await fetch(`/api/documents/${params.documentId}/citations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ work_source_id: finalSourceId }),
              });
              const citData = await citRes.json();
              if (!citRes.ok) throw new Error(citData.error || 'Failed to create citation');

              const { citationId: newCitationId } = citData;

              // Step 3: Replace citation node by citationId (Undo/Redo safe)
              try {
                const replaced = editor.commands.command(
                  buildReplaceCitationCommand(oldCitationId, newCitationId, finalSourceId)
                );

                if (!replaced) {
                  throw new Error('Could not locate the citation in the document.');
                }
              } catch (cmdErr: any) {
                await fetch(`/api/documents/${params.documentId}/citations/${newCitationId}`, { method: 'DELETE' }).catch(() => {});
                throw cmdErr;
              }

              // Step 4: Log event (fire and forget)
              fetch(`/api/documents/${params.documentId}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  event_type: 'citation_replaced',
                  metadata: { old_citation_id: oldCitationId, new_citation_id: newCitationId, new_source_id: finalSourceId }
                }),
              }).catch(() => {});

              // Step 5: Show toast (set state used by toast component)
              setToastMessage('Citation updated');
              setTimeout(() => setToastMessage(null), 3000);

            } catch (err: any) {
              console.error('[replaceCitation]', err);
              alert(err.message);
            }
          }}
          onAddSupportingCitation={async (oldCitationId: string, candidateSource: any) => {
            if (!editorRef.current || !doc?.work_id) return;
            const editor = editorRef.current;
            try {
              let finalSourceId: string;
              const saveRes = await fetch(`/api/works/${doc.work_id}/sources`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(candidateSource),
              });
              const saveData = await saveRes.json();

              if (saveRes.status === 409 && saveData.sourceId) {
                finalSourceId = saveData.sourceId;
              } else if (!saveRes.ok) {
                throw new Error(saveData.error || 'Failed to save source');
              } else {
                finalSourceId = saveData.id;
                refreshSources(saveData);
              }

              const citRes = await fetch(`/api/documents/${params.documentId}/citations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ work_source_id: finalSourceId }),
              });
              const citData = await citRes.json();
              if (!citRes.ok) throw new Error(citData.error || 'Failed to create citation');

              const { citationId: newCitationId } = citData;

              try {
                const added = editor.commands.command(
                  buildAddSupportingCitationCommand(oldCitationId, newCitationId, finalSourceId)
                );

                if (!added) {
                  throw new Error('Could not locate the citation in the document.');
                }
              } catch (cmdErr: any) {
                await fetch(`/api/documents/${params.documentId}/citations/${newCitationId}`, { method: 'DELETE' }).catch(() => {});
                
                if (cmdErr.message === 'Already cited here') {
                  setToastMessage('Already cited here');
                  setTimeout(() => setToastMessage(null), 3000);
                  return;
                }
                throw cmdErr;
              }

              fetch(`/api/documents/${params.documentId}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  event_type: 'citation_inserted',
                  metadata: { citation_id: newCitationId, source_id: finalSourceId }
                }),
              }).catch(() => {});

              setToastMessage('Supporting citation added');
              setTimeout(() => setToastMessage(null), 3000);

            } catch (err: any) {
              console.error('[addSupportingCitation]', err);
              alert(err.message);
            }
          }}
        />
      )}
    </div>
    </CitationProvider>
    {/* ── Toast ── */}
    {toastMessage && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0B1628] text-white text-[13px] font-medium px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
        <CheckCircle size={14} className="text-status-success" />
        {toastMessage}
      </div>
    )}
  </>
  );
}
