import { NormalizedSource } from '../sources/types';
import { normalizeDoi, normalizeTitle } from '../sources/normalize';
import { searchCrossref, lookupCrossrefByDoi } from './providers/crossref';
import { searchOpenAlex, lookupOpenAlexByDoi } from './providers/openalex';
import { ResearchResult, ProviderProvenance } from './types';
import { buildIntegrity } from './integrity';

function mergeSources(sources: NormalizedSource[]): { source: NormalizedSource, provenance: ProviderProvenance } {
  if (sources.length === 0) throw new Error("Cannot merge empty array");
  
  // Prefer openalex as base since it has richer metadata (topics, OA)
  const base = sources.find(s => s.source_provider === 'openalex') || sources[0];
  const other = sources.find(s => s !== base);

  const merged = { ...base };
  const provenance: ProviderProvenance = {
    providers: [],
    provider_ids: {},
    provider_fields: {}
  };

  sources.forEach(s => {
    provenance.providers.push(s.source_provider);
    provenance.provider_fields[s.source_provider] = {
      title: s.title,
      year: s.publication_year,
      doi: s.doi
    };
    if (s.metadata?.openalex_id) provenance.provider_ids['openalex'] = s.metadata.openalex_id as string;
    // Crossref doesn't have a distinct ID other than DOI usually, we'll just use DOI if present
    if (s.source_provider === 'crossref' && s.doi) provenance.provider_ids['crossref'] = s.doi;
  });

  if (other) {
    // Fill in missing fields from the other provider
    if (!merged.abstract && other.abstract) merged.abstract = other.abstract;
    if (!merged.doi && other.doi) merged.doi = other.doi;
    if (!merged.publication_year && other.publication_year) merged.publication_year = other.publication_year;
    
    // Merge metadata
    merged.metadata = { ...other.metadata, ...merged.metadata };
  }

  return { source: merged, provenance };
}

export async function performResearchSearch(query: string): Promise<{ results: ResearchResult[], providerStatus: Record<string, string> }> {
  const providerStatus: Record<string, string> = { crossref: 'ok', openalex: 'ok' };
  
  let crossrefResults: NormalizedSource[] = [];
  let openalexResults: NormalizedSource[] = [];

  // Parallel provider calls
  try {
    crossrefResults = await searchCrossref(query);
  } catch (e: any) {
    providerStatus.crossref = e.message || 'error';
  }

  try {
    openalexResults = await searchOpenAlex(query);
  } catch (e: any) {
    providerStatus.openalex = e.message || 'error';
  }

  const mergedMap = new Map<string, NormalizedSource[]>();
  const resultsWithoutDoi: NormalizedSource[][] = [];

  const addResult = (source: NormalizedSource) => {
    const doi = normalizeDoi(source.doi);
    if (doi) {
      if (!mergedMap.has(doi)) mergedMap.set(doi, []);
      mergedMap.get(doi)!.push(source);
    } else {
      // Fallback matching for non-DOI sources
      let foundMatch = false;
      for (const group of resultsWithoutDoi) {
        const repr = group[0];
        const sameTitle = normalizeTitle(repr.title).toLowerCase() === normalizeTitle(source.title).toLowerCase();
        const sameYear = repr.publication_year === source.publication_year;
        if (sameTitle && sameYear) {
          group.push(source);
          foundMatch = true;
          break;
        }
      }
      if (!foundMatch) resultsWithoutDoi.push([source]);
    }
  };

  crossrefResults.forEach(addResult);
  openalexResults.forEach(addResult);

  const finalResults: ResearchResult[] = [];

  // Process DOI matched groups
  for (const group of Array.from(mergedMap.values())) {
    const { source, provenance } = mergeSources(group);
    const integrity = buildIntegrity(source, provenance.providers, query);
    finalResults.push({ source, provenance, integrity });
  }

  // Process non-DOI groups
  for (const group of resultsWithoutDoi) {
    const { source, provenance } = mergeSources(group);
    const integrity = buildIntegrity(source, provenance.providers, query);
    finalResults.push({ source, provenance, integrity });
  }

  // Sort by relevance score (high -> low) roughly
  const scoreMap: Record<string, number> = { 'high': 3, 'medium': 2, 'low': 1, 'unknown': 0 };
  finalResults.sort((a, b) => scoreMap[b.integrity.relevance.status] - scoreMap[a.integrity.relevance.status]);

  return { results: finalResults, providerStatus };
}

export async function performDoiLookup(doi: string, expectedTitle?: string): Promise<{ result: ResearchResult | null, providerStatus: Record<string, string> }> {
  const providerStatus: Record<string, string> = { crossref: 'ok', openalex: 'ok' };
  
  let crossrefResult: NormalizedSource | null = null;
  let openalexResult: NormalizedSource | null = null;

  try {
    crossrefResult = await lookupCrossrefByDoi(doi);
  } catch (e: any) {
    providerStatus.crossref = e.message || 'error';
  }

  try {
    openalexResult = await lookupOpenAlexByDoi(doi);
  } catch (e: any) {
    providerStatus.openalex = e.message || 'error';
  }

  const group: NormalizedSource[] = [];
  if (crossrefResult) group.push(crossrefResult);
  if (openalexResult) group.push(openalexResult);

  if (group.length === 0) return { result: null, providerStatus };

  const { source, provenance } = mergeSources(group);
  const integrity = buildIntegrity(source, provenance.providers, '', doi, expectedTitle);
  
  return { result: { source, provenance, integrity }, providerStatus };
}
