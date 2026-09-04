'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { EditorToolbar } from './EditorToolbar';
import { VerbaBlockId, IssueHighlight, IssueProp } from './editor/EditorExtensions';

/** A parsed block from docx_processor / parsed_content */
interface Block {
  id: string;
  type: string;
  style: string;
  level?: number;
  text?: string;
  runs?: { text: string; bold: boolean; italic: boolean }[];
}

/** Tiptap JSON document node — used when loading from editor_state */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TiptapJson = Record<string, any>;

interface DocumentEditorProps {
  /** Parsed blocks from parsed_content — used only when no editor_state exists */
  initialBlocks?: Block[];
  /** Tiptap JSON from editor_state — takes priority over initialBlocks */
  initialEditorJson?: TiptapJson | null;
  isEditable?: boolean;
  zoomLevel?: number;
  issues?: IssueProp[];
  selectedIssueId?: string | null;
  onIssueSelect?: (issueId: string | null) => void;
  onEditorReady?: (editor: Editor) => void;
  /** Called with the latest Tiptap JSON whenever the document changes (for autosave) */
  onUpdate?: (json: TiptapJson) => void;
}

/**
 * Convert parser blocks into HTML that Tiptap can ingest.
 * Used ONLY for the initial load when editor_state is NULL.
 * Preserves the original parsed block IDs via data-verba-block-id.
 */
const blocksToHtml = (blocks: Block[]): string => {
  return blocks
    .map(block => {
      let content = '';

      if (block.runs && block.runs.length > 0) {
        content = block.runs
          .map(run => {
            let text = run.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            if (run.bold) text = `<strong>${text}</strong>`;
            if (run.italic) text = `<em>${text}</em>`;
            return text;
          })
          .join('');
      } else {
        content = (block.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }

      if (block.type === 'heading') {
        const level = Math.min(Math.max(block.level || 1, 1), 6);
        return `<h${level} data-verba-block-id="${block.id}">${content}</h${level}>`;
      }
      return `<p data-verba-block-id="${block.id}">${content}</p>`;
    })
    .join('');
};

export function DocumentEditor({
  initialBlocks,
  initialEditorJson,
  isEditable = true,
  zoomLevel = 100,
  issues = [],
  selectedIssueId = null,
  onIssueSelect = () => {},
  onEditorReady,
  onUpdate,
}: DocumentEditorProps) {
  const [mounted, setMounted] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      VerbaBlockId,
      IssueHighlight.configure({
        issues,
        selectedIssueId,
        onIssueSelect,
      }),
    ],
    content: '',
    editable: isEditable,
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[1000px]',
      },
    },
    // onUpdate fires after every document change — used for autosave debouncing upstream
    onUpdate: ({ editor: e }) => {
      if (onUpdate) {
        onUpdate(e.getJSON());
      }
    },
  });

  // Keep highlight extension options in sync when props change
  useEffect(() => {
    if (editor) {
      editor.extensionManager.extensions.forEach(ext => {
        if (ext.name === 'issueHighlight') {
          ext.options.issues = issues;
          ext.options.selectedIssueId = selectedIssueId;
          ext.options.onIssueSelect = onIssueSelect;
        }
      });
      editor.view.dispatch(editor.state.tr.setMeta('updateHighlight', true));
    }
  }, [editor, issues, selectedIssueId, onIssueSelect]);

  // Initialize editor content exactly ONCE (when editor is ready and content not yet set)
  useEffect(() => {
    if (!editor || mounted) return;

    if (initialEditorJson && typeof initialEditorJson === 'object') {
      // CASE A: editor_state exists — load Tiptap JSON directly
      // This preserves exact verbaBlockId values and all formatting
      editor.commands.setContent(initialEditorJson);
    } else if (initialBlocks && initialBlocks.length > 0) {
      // CASE B: editor_state is null — seed from parsed_content blocks
      // Preserves original parsed block IDs via data-verba-block-id
      const html = blocksToHtml(initialBlocks);
      editor.commands.setContent(html);
    }
    // Either way, mark mounted so we never re-initialize from props
    setMounted(true);

    if (onEditorReady) {
      onEditorReady(editor);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) {
    return null;
  }

  const scale = zoomLevel === 0 ? 1 : zoomLevel / 100;
  const a4Width = 820;
  const a4MinHeight = 1123;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F6F8FB] relative overflow-hidden">
      {/* Document Toolbar (Sticky Header) */}
      <div className="sticky top-0 z-20 w-full bg-white shadow-sm shrink-0">
        <EditorToolbar editor={editor} />
      </div>

      {/* Scrollable Document Area */}
      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-12 md:py-12 flex justify-center items-start scroll-smooth w-full">
        <div
          className="bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-[#E5EAF0] p-10 sm:p-16 md:p-24 pb-32 mb-32 origin-top transition-transform duration-200"
          style={{
            width: `${a4Width}px`,
            minHeight: `${a4MinHeight}px`,
            transform: `scale(${scale})`,
            marginBottom: scale < 1 ? `-${a4MinHeight * (1 - scale)}px` : '32px',
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
