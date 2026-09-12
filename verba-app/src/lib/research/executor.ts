import { searchCrossref } from './providers/crossref';
import { searchOpenAlex } from './providers/openalex';
import { searchGoogleBooks } from './providers/googleBooks';
import { searchOpenLibrary } from './providers/openLibrary';
import { searchArxiv } from './providers/arxiv';
import { searchSerper } from './providers/serper';
import { SourceProvider, NormalizedSource } from '../sources/types';

export type ProviderExecutionStatus =
  | 'planned'
  | 'called'
  | 'succeeded'
  | 'failed'
  | 'skipped'
  | 'fallback_not_needed'
  | 'disabled_missing_configuration';

export interface ExecutionResult {
  rawCandidates: { source: NormalizedSource; provider: SourceProvider }[];
  providerStatus: Record<SourceProvider, { status: ProviderExecutionStatus; error?: string }>;
}

const providerRegistry: Partial<Record<SourceProvider, (query: string, maxResults?: number) => Promise<NormalizedSource[]>>> = {
  crossref: searchCrossref,
  openalex: searchOpenAlex,
  google_books: searchGoogleBooks,
  open_library: searchOpenLibrary,
  arxiv: searchArxiv,
  serper: searchSerper
};

// Conservative check for usable discovery results
export function isUsableResearchResult(source: NormalizedSource): boolean {
  if (!source.title || source.title.trim().length === 0) return false;
  if (!source.source_type) return false;
  
  // Needs some identity signal
  const hasIdentifier = source.identifiers && source.identifiers.length > 0;
  const hasAuthors = source.authors && source.authors.length > 0;
  const hasLocation = source.locations && source.locations.length > 0;
  
  if (!hasIdentifier && !hasAuthors && !hasLocation) return false;
  
  return true;
}

export async function executeProviders(providers: SourceProvider[], query: string): Promise<ExecutionResult> {
  const providerStatus = {} as Record<SourceProvider, { status: ProviderExecutionStatus; error?: string }>;
  const rawCandidates: { source: NormalizedSource; provider: SourceProvider }[] = [];

  for (const p of providers) {
    providerStatus[p] = { status: 'planned' };
  }

  await Promise.allSettled(
    providers.map(async (provider) => {
      try {
        const fetcher = providerRegistry[provider];
        if (!fetcher) {
          providerStatus[provider].status = 'skipped';
          providerStatus[provider].error = 'unsupported_runtime_provider';
          return;
        }
        
        providerStatus[provider].status = 'called';
        const results = await fetcher(query);
        providerStatus[provider].status = 'succeeded';
        for (const r of results) {
          rawCandidates.push({ source: r, provider });
        }
      } catch (err: any) {
        const msg = err.message || 'error';
        if (msg === 'disabled_missing_configuration') {
          providerStatus[provider].status = 'disabled_missing_configuration';
        } else {
          providerStatus[provider].status = 'failed';
          providerStatus[provider].error = msg;
        }
      }
    })
  );

  return { rawCandidates, providerStatus };
}
