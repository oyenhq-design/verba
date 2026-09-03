'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { EditorToolbar } from './EditorToolbar';

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
      return `<h${level}>${content}</h${level}>`;
    }
    
    return `<p>${content}</p>`;
  }).join('');
};

export function DocumentEditor({ initialBlocks, isEditable = true }: DocumentEditorProps) {
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
    ],
    content: '',
    editable: isEditable,
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none focus:outline-none min-h-[800px]',
      },
    },
  });

  useEffect(() => {
    if (editor && initialBlocks.length > 0 && !mounted) {
      const htmlContent = blocksToHtml(initialBlocks);
      editor.commands.setContent(htmlContent);
      setMounted(true);
    }
  }, [editor, initialBlocks, mounted]);

  if (!editor) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F6F8FB] relative">
      {/* Document Toolbar (Sticky Header) */}
      <div className="sticky top-0 z-20 w-full bg-white border-b border-[#E5EAF0] shadow-sm">
        <EditorToolbar editor={editor} />
      </div>

      {/* Scrollable Document Area */}
      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-12 md:py-12 flex justify-center scroll-smooth">
        <div 
          className="w-full max-w-[820px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E5EAF0] p-10 sm:p-16 md:p-24 pb-32"
          style={{ minHeight: '1123px' }} // Approximate A4 aspect ratio height for 820px width
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
