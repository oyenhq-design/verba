import React, { createContext, useContext } from 'react';
import { NormalizedSource } from '@/lib/sources/types';
import { CitationStyle } from '@/lib/citations/formatter';

interface CitationContextValue {
  sources: NormalizedSource[];
  style: CitationStyle;
  // Array of { citationId, sourceId } in document order (used for IEEE numbering and Bibliography)
  documentCitations: { citationId: string; sourceId: string }[]; 
}

const CitationContext = createContext<CitationContextValue>({
  sources: [],
  style: 'apa',
  documentCitations: [],
});

export const useCitationContext = () => useContext(CitationContext);

export const CitationProvider: React.FC<{
  sources: NormalizedSource[];
  style: CitationStyle;
  documentCitations: { citationId: string; sourceId: string }[];
  children: React.ReactNode;
}> = ({ sources, style, documentCitations, children }) => {
  return (
    <CitationContext.Provider value={{ sources, style, documentCitations }}>
      {children}
    </CitationContext.Provider>
  );
};
