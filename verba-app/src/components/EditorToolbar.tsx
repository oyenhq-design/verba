'use client';

import React from 'react';
import { type Editor } from '@tiptap/react';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Type,
  List,
  ListOrdered,
  IndentIncrease,
  IndentDecrease,
  MoreHorizontal,
  ChevronDown
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) {
    return null;
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();

  const setAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
    editor.chain().focus().setTextAlign(align).run();
  };

  const setHeading = (level: 1 | 2 | 3) => {
    editor.chain().focus().toggleHeading({ level }).run();
  };
  
  const setParagraph = () => {
    editor.chain().focus().setParagraph().run();
  };

  const undo = () => editor.chain().focus().undo().run();
  const redo = () => editor.chain().focus().redo().run();

  const ToolbarButton = ({ 
    isActive = false, 
    onClick, 
    disabled = false, 
    children 
  }: { 
    isActive?: boolean; 
    onClick?: () => void; 
    disabled?: boolean; 
    children: React.ReactNode; 
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded-md transition-colors flex items-center justify-center
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100'}
        ${isActive ? 'bg-accent/10 text-accent' : 'text-slate-600'}
      `}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-[1px] h-[20px] bg-slate-200 mx-2" />;

  return (
    <div className="flex items-center px-4 py-2 space-x-1 overflow-x-auto bg-[#F6F8FB] border-b border-border-light">
      {/* History */}
      <ToolbarButton onClick={undo} disabled={!editor.can().undo()}>
        <Undo size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={redo} disabled={!editor.can().redo()}>
        <Redo size={16} />
      </ToolbarButton>

      <Divider />

      {/* Styles */}
      <ToolbarButton onClick={setParagraph} isActive={editor.isActive('paragraph')}>
        <Type size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => setHeading(1)} isActive={editor.isActive('heading', { level: 1 })}>
        <Heading1 size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => setHeading(2)} isActive={editor.isActive('heading', { level: 2 })}>
        <Heading2 size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => setHeading(3)} isActive={editor.isActive('heading', { level: 3 })}>
        <Heading3 size={16} />
      </ToolbarButton>

      <Divider />

      {/* Fonts (Mock for now) */}
      <div className="flex items-center mx-1 px-2 py-1 rounded hover:bg-slate-200 cursor-not-allowed opacity-50 text-slate-600 transition-colors">
        <span className="text-[13px] mr-1">Inter</span>
        <ChevronDown size={14} />
      </div>
      <div className="flex items-center mx-1 px-2 py-1 rounded hover:bg-slate-200 cursor-not-allowed opacity-50 text-slate-600 transition-colors">
        <span className="text-[13px] mr-1">11</span>
        <ChevronDown size={14} />
      </div>

      <Divider />

      {/* Text Marks */}
      <ToolbarButton onClick={toggleBold} isActive={editor.isActive('bold')} disabled={!editor.can().toggleBold()}>
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={toggleItalic} isActive={editor.isActive('italic')} disabled={!editor.can().toggleItalic()}>
        <Italic size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={toggleUnderline} isActive={editor.isActive('underline')} disabled={!editor.can().toggleUnderline()}>
        <Underline size={16} />
      </ToolbarButton>

      <Divider />

      {/* Alignment */}
      <ToolbarButton onClick={() => setAlign('left')} isActive={editor.isActive({ textAlign: 'left' })}>
        <AlignLeft size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => setAlign('center')} isActive={editor.isActive({ textAlign: 'center' })}>
        <AlignCenter size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => setAlign('right')} isActive={editor.isActive({ textAlign: 'right' })}>
        <AlignRight size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => setAlign('justify')} isActive={editor.isActive({ textAlign: 'justify' })}>
        <AlignJustify size={16} />
      </ToolbarButton>

      <Divider />

      {/* Lists (Mocked) */}
      <ToolbarButton disabled={true}>
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton disabled={true}>
        <ListOrdered size={16} />
      </ToolbarButton>

      <Divider />

      {/* Indent (Mocked) */}
      <ToolbarButton disabled={true}>
        <IndentDecrease size={16} />
      </ToolbarButton>
      <ToolbarButton disabled={true}>
        <IndentIncrease size={16} />
      </ToolbarButton>

      <Divider />

      {/* More (Mocked) */}
      <ToolbarButton disabled={true}>
        <MoreHorizontal size={16} />
      </ToolbarButton>
    </div>
  );
}
