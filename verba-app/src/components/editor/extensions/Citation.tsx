import { mergeAttributes, Node, ReactNodeViewRenderer } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import React from 'react';
import { useCitationContext } from '@/components/workspace/CitationContext';
import { formatInlineCitation } from '@/lib/citations/formatter';

const CitationNodeView = (props: any) => {
  const { node } = props;
  const { citationId, sourceId } = node.attrs;
  const { sources, style, documentCitations } = useCitationContext();

  const source = sources.find(s => s.id === sourceId) || null;
  
  // Calculate index for IEEE
  let index = undefined;
  if (style === 'ieee' && documentCitations) {
    const idx = documentCitations.findIndex(c => c.citationId === citationId);
    if (idx !== -1) index = idx + 1;
  }

  const renderedText = formatInlineCitation(source, style, index);

  return (
    <NodeViewWrapper as="span" className="inline-block px-1 mx-0.5 rounded bg-muted/50 text-muted-foreground text-[0.9em] cursor-pointer hover:bg-muted/80 transition-colors" data-citation-id={citationId} data-source-id={sourceId}>
      {renderedText}
    </NodeViewWrapper>
  );
};

export const Citation = Node.create({
  name: 'citation',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      citationId: {
        default: null,
      },
      sourceId: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-citation-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), ''];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CitationNodeView);
  },
});
