'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { EditorToolbar } from './EditorToolbar';
import { VerbaBlockId, IssueHighlight, IssueProp } from './editor/EditorExtensions';

interface Block {
  id: string;
  type: string;
  style: string;
  level?: number;
  text?: string;
  runs?: { text: string; bold: boolean; italic: boolean; }[];
}

interface DocumentEditorProps {
  initialBlocks: Block[];
  isEditable?: boolean;
  zoomLevel?: number;
  issues?: IssueProp[];
  selectedIssueId?: string | null;
  onIssueSelect?: (issueId: string | null) => void;
  onEditorReady?: (editor: Editor) => void;
}

// Convert parser blocks into an HTML string that Tiptap can ingest securely
const blocksToHtml = (blocks: Block[]): string => {
  return blocks.map(block => {
    let content = '';
    
    // If runs exist, render them
    if (block.runs && block.runs.length > 0) {
      content = block.runs.map(run => {
        let text = run.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (run.bold) text = `<strong>${text}</strong>`;
        if (run.italic) text = `<em>${text}</em>`;
        return text;
      }).join('');
    } else {
      // Fallback to block text
      content = (block.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    if (block.type === 'heading') {
      const level = Math.min(Math.max(block.level || 1, 1), 6);
      return `<h${level} data-verba-block-id="${block.id}">${content}</h${level}>`;
    }
    
    return `<p data-verba-block-id="${block.id}">${content}</p>`;
  }).join('');
};

export function DocumentEditor({ 
  initialBlocks, 
  isEditable = true, 
  zoomLevel = 100,
  issues = [],
  selectedIssueId = null,
  onIssueSelect = () => {},
  onEditorReady
}: DocumentEditorProps) {
  const [mounted, setMounted] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      VerbaBlockId,
      IssueHighlight.configure({
        issues: issues,
        selectedIssueId: selectedIssueId,
        onIssueSelect: onIssueSelect,
      }),
    ],
    content: '',
    editable: isEditable,
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[1000px]',
      },
    },
  });

  // Update extension options when props change
  useEffect(() => {
    if (editor) {
      editor.extensionManager.extensions.forEach(ext => {
        if (ext.name === 'issueHighlight') {
          ext.options.issues = issues;
          ext.options.selectedIssueId = selectedIssueId;
          ext.options.onIssueSelect = onIssueSelect;
        }
      });
      // Force a transaction to trigger decoration update
      editor.view.dispatch(editor.state.tr.setMeta('updateHighlight', true));
    }
  }, [editor, issues, selectedIssueId, onIssueSelect]);

  useEffect(() => {
    if (editor && initialBlocks.length > 0 && !mounted) {
      const htmlContent = blocksToHtml(initialBlocks);
      editor.commands.setContent(htmlContent);
      setMounted(true);
      if (onEditorReady) {
        onEditorReady(editor);
      }
    }
  }, [editor, initialBlocks, mounted, onEditorReady]);

  if (!editor) {
    return null;
  }

  // Calculate scaling for zoom
  // Ensure zoom scale applies correctly. Fit width would be represented as a special case in the parent, but here we expect a numeric percentage.
  const scale = zoomLevel === 0 ? 1 : zoomLevel / 100;
  
  // Base A4 dimensions at 100%
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
            // When scaling down, the visual space taken is smaller, but DOM flow doesn't know. 
            // Margin adjustment for scaling can be complex, so keeping origin-top centers it well horizontally.
            marginBottom: scale < 1 ? `-${a4MinHeight * (1 - scale)}px` : '32px'
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
