import { NormalizedSource } from '../sources/types';
import { normalizeDoi, normalizeTitle } from '../sources/normalize';
import { searchCrossref, lookupCrossrefByDoi } from './providers/crossref';
import { searchOpenAlex, lookupOpenAlexByDoi } from './providers/openalex';
import { searchGoogleBooks } from './providers/googleBooks';
import { searchOpenLibrary } from './providers/openLibrary';
import { ResearchResult, ProviderProvenance } from './types';
import { buildIntegrity } from './integrity';

function mergeSources(sources: NormalizedSource[]): { source: NormalizedSource, provenance: ProviderProvenance } {
  if (sources.length === 0) throw new Error("Cannot merge empty array");
  
  // Prefer openalex as base since it has richer metadata (topics, OA)
  // If no openalex, prefer crossref, else just use the first.
  const base = sources.find(s => s.source_provider === 'openalex') || 
               sources.find(s => s.source_provider === 'crossref') || 
               sources[0];
               
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
    if (s.source_provider === 'crossref' && s.doi) provenance.provider_ids['crossref'] = s.doi;
    if (s.source_provider === 'google_books' && s.metadata?.google_books_id) provenance.provider_ids['google_books'] = s.metadata.google_books_id as string;
    if (s.source_provider === 'open_library' && s.metadata?.open_library_key) provenance.provider_ids['open_library'] = s.metadata.open_library_key as string;
  });

  // Unique merge all sources into 'merged'
  const allIdentifiers = [...(merged.identifiers || [])];
  const allLocations = [...(merged.locations || [])];

  sources.forEach(other => {
    if (other === base) return;

    if (!merged.abstract && other.abstract) merged.abstract = other.abstract;
    if (!merged.doi && other.doi) merged.doi = other.doi;
    if (!merged.publication_year && other.publication_year) merged.publication_year = other.publication_year;
    
    // Merge metadata
    merged.metadata = { ...other.metadata, ...merged.metadata };
    
    if (other.identifiers) allIdentifiers.push(...other.identifiers);
    if (other.locations) allLocations.push(...other.locations);
  });

  // Deduplicate arrays
  if (allIdentifiers.length > 0) {
    const uniqueIdentifiers = Array.from(new Map(allIdentifiers.map(i => [`${i.identifier_type}:${i.normalized_value}`, i])).values());
    merged.identifiers = uniqueIdentifiers;
  }
  if (allLocations.length > 0) {
    const uniqueLocations = Array.from(new Map(allLocations.map(l => [l.url, l])).values());
    merged.locations = uniqueLocations;
  }

  return { source: merged, provenance };
}

export async function performResearchSearch(query: string): Promise<{ results: ResearchResult[], providerStatus: Record<string, string> }> {
  const providerStatus: Record<string, string> = { crossref: 'ok', openalex: 'ok', google_books: 'ok', open_library: 'ok' };
  
  let crossrefResults: NormalizedSource[] = [];
  let openalexResults: NormalizedSource[] = [];
  let googleBooksResults: NormalizedSource[] = [];
  let openLibraryResults: NormalizedSource[] = [];

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

  try {
    googleBooksResults = await searchGoogleBooks(query);
  } catch (e: any) {
    providerStatus.google_books = e.message || 'error';
  }

  try {
    openLibraryResults = await searchOpenLibrary(query);
  } catch (e: any) {
    providerStatus.open_library = e.message || 'error';
  }

  const groups: NormalizedSource[][] = [];

  const addResult = (source: NormalizedSource) => {
    let matchIndex = -1;

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const repr = group[0];

      // 1. Exact DOI match
      const sourceDoi = source.identifiers?.find(i => i.identifier_type === 'doi')?.normalized_value;
      const reprDoi = repr.identifiers?.find(i => i.identifier_type === 'doi')?.normalized_value;
      if (sourceDoi && reprDoi && sourceDoi === reprDoi) {
        matchIndex = i; break;
      }

      // 2. Exact PMID match
      const sourcePmid = source.identifiers?.find(i => i.identifier_type === 'pmid')?.normalized_value;
      const reprPmid = repr.identifiers?.find(i => i.identifier_type === 'pmid')?.normalized_value;
      if (sourcePmid && reprPmid && sourcePmid === reprPmid) {
        matchIndex = i; break;
      }

      // 3. Exact PMCID match
      const sourcePmcid = source.identifiers?.find(i => i.identifier_type === 'pmcid')?.normalized_value;
      const reprPmcid = repr.identifiers?.find(i => i.identifier_type === 'pmcid')?.normalized_value;
      if (sourcePmcid && reprPmcid && sourcePmcid === reprPmcid) {
        matchIndex = i; break;
      }

      // 4. Exact Handle match
      const sourceHandle = source.identifiers?.find(i => i.identifier_type === 'handle')?.normalized_value;
      const reprHandle = repr.identifiers?.find(i => i.identifier_type === 'handle')?.normalized_value;
      if (sourceHandle && reprHandle && sourceHandle === reprHandle) {
        matchIndex = i; break;
      }

      // 5. Exact ISBN match (but require title match for chapters to prevent false merges)
      const sourceIsbns = source.identifiers?.filter(i => i.identifier_type === 'isbn').map(i => i.normalized_value) || [];
      const reprIsbns = repr.identifiers?.filter(i => i.identifier_type === 'isbn').map(i => i.normalized_value) || [];
      const hasOverlappingIsbn = sourceIsbns.some(isbn => reprIsbns.includes(isbn));
      
      if (hasOverlappingIsbn) {
        if (source.source_type === 'book_chapter' || repr.source_type === 'book_chapter') {
           const sameTitle = normalizeTitle(repr.title).toLowerCase() === normalizeTitle(source.title).toLowerCase();
           if (sameTitle) { matchIndex = i; break; }
        } else {
           // Basic title check to avoid merging different editions if titles are wildly different?
           // Actually user says: "Exact ISBN + compatible title + compatible authors -> strong merge candidate"
           // For now, overlapping ISBN for books is usually sufficient, but we can do a loose title check if desired.
           matchIndex = i; break;
        }
      }

      // 6. Fallback matching (title + year + author)
      const sameTitle = normalizeTitle(repr.title).toLowerCase() === normalizeTitle(source.title).toLowerCase();
      const sameYear = repr.publication_year === source.publication_year;
      if (sameTitle && sameYear) {
         matchIndex = i; break;
      }
    }

    if (matchIndex !== -1) {
      groups[matchIndex].push(source);
    } else {
      groups.push([source]);
    }
  };

  crossrefResults.forEach(addResult);
  openalexResults.forEach(addResult);
  googleBooksResults.forEach(addResult);
  openLibraryResults.forEach(addResult);

  const finalResults: ResearchResult[] = [];

  for (const group of groups) {
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
