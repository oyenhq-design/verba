import React from 'react';
import { useCitationContext } from './CitationContext';
import { formatBibliographyEntry, sortBibliography } from '@/lib/citations/formatter';

export function BibliographyPreview() {
  const { sources, style, documentCitations } = useCitationContext();

  if (!documentCitations || documentCitations.length === 0) return null;

  // 1. Gather all unique sources that are actually cited
  const citedSourceIds = Array.from(new Set(documentCitations.map(c => c.sourceId)));
  const citedSources = citedSourceIds
    .map(id => sources.find(s => s.id === id))
    .filter(Boolean) as any[];

  // 2. Sort according to style
  const sorted = sortBibliography(citedSources, style);

  return (
    <div className="mt-12 pt-8 border-t border-border/50 select-none max-w-[800px] mx-auto pb-12">
      <h2 className="text-xl font-semibold mb-4 text-[#0B1628]">Generated References Preview</h2>
      <div className="space-y-4">
        {sorted.map((source, idx) => {
          // If IEEE, the index comes from the first appearance in documentCitations
          let index = undefined;
          if (style === 'ieee') {
            index = documentCitations.findIndex(c => c.sourceId === source.id) + 1;
          }
          
          return (
            <div key={source.id} className="text-[14px] text-foreground-secondary pl-4 -indent-4">
              {formatBibliographyEntry(source, style, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
