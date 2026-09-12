import { NormalizedSource } from '../sources/types';
import { normalizeDoi, normalizeTitle } from '../sources/normalize';
import { ResearchResult, ProviderProvenance } from './types';
import { buildIntegrity } from './integrity';
import { planResearchQuery, ResearchPlan } from './planner';
import { executeProviders, isUsableResearchResult, ProviderExecutionStatus } from './executor';

// Kept purely for the lookup endpoint
import { lookupCrossrefByDoi } from './providers/crossref';
import { lookupOpenAlexByDoi } from './providers/openalex';

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
    if (s.source_provider === 'arxiv' && s.metadata?.arxiv_version_id) provenance.provider_ids['arxiv'] = s.metadata.arxiv_version_id as string;
    if (s.source_provider === 'serper' && s.url) provenance.provider_ids['serper'] = s.url;
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

  // Ensure abstract isn't populated from a serper snippet if one got accidentally passed
  if (merged.source_provider === 'serper' && merged.abstract === merged.metadata?.snippet) {
     merged.abstract = null;
  }

  return { source: merged, provenance };
}

export async function performResearchSearch(query: string): Promise<{ results: ResearchResult[], providerStatus: Record<string, any>, plan: ResearchPlan }> {
  // 1. Plan Research Intent
  const plan = planResearchQuery(query, 'ordinary_research');
  
  // 2. Execute Primary Providers
  const { rawCandidates, providerStatus } = await executeProviders(plan.primaryProviders, plan.originalQuery);

  const groups: NormalizedSource[][] = [];

  const addResult = (source: NormalizedSource) => {
    let matchIndex = -1;

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const repr = group[0];

      // Exact DOI match
      const sourceDoi = source.identifiers?.find(i => i.identifier_type === 'doi')?.normalized_value || source.doi;
      const reprDoi = repr.identifiers?.find(i => i.identifier_type === 'doi')?.normalized_value || repr.doi;
      const sameDoi = sourceDoi && reprDoi && sourceDoi === reprDoi;
      
      const isCrossTypeMatch = (source.source_type === 'preprint' && repr.source_type === 'journal_article') ||
                               (source.source_type === 'journal_article' && repr.source_type === 'preprint');
                               
      if (sameDoi && !isCrossTypeMatch) {
        matchIndex = i;
        break;
      }

      // PMCID/PMID/Handle exact matches ...
      const exactMatchTypes = ['pmid', 'pmcid', 'handle'];
      for (const t of exactMatchTypes) {
         const sid = source.identifiers?.find(i => i.identifier_type === t)?.normalized_value;
         const rid = repr.identifiers?.find(i => i.identifier_type === t)?.normalized_value;
         if (sid && rid && sid === rid) { matchIndex = i; break; }
      }
      if (matchIndex !== -1) break;

      // Exact ISBN match
      const sourceIsbns = source.identifiers?.filter(i => i.identifier_type === 'isbn').map(i => i.normalized_value) || [];
      const reprIsbns = repr.identifiers?.filter(i => i.identifier_type === 'isbn').map(i => i.normalized_value) || [];
      const hasOverlappingIsbn = sourceIsbns.some(isbn => reprIsbns.includes(isbn));
      
      if (hasOverlappingIsbn) {
        if (source.source_type === 'book_chapter' || repr.source_type === 'book_chapter') {
           const sameTitle = normalizeTitle(repr.title).toLowerCase() === normalizeTitle(source.title).toLowerCase();
           if (sameTitle) { matchIndex = i; break; }
        } else {
           matchIndex = i; break;
        }
      }

      // Fallback matching
      const sameTitle = normalizeTitle(repr.title).toLowerCase() === normalizeTitle(source.title).toLowerCase();
      const sameYear = repr.publication_year === source.publication_year;
      if (sameTitle && sameYear) {
         matchIndex = i; break;
      }
    }

    if (matchIndex !== -1) groups[matchIndex].push(source);
    else groups.push([source]);
  };

  // 3. Process Primary Candidates
  rawCandidates.forEach(c => addResult(c.source));

  // 4. Evaluate Usable Coverage
  const usableCount = groups.filter(g => g.some(s => isUsableResearchResult(s))).length;

  // 5. Execute Fallbacks if Needed
  if (usableCount < 3 && plan.fallbackProviders.length > 0) {
    const fallbackExec = await executeProviders(plan.fallbackProviders, plan.originalQuery);
    fallbackExec.rawCandidates.forEach(c => addResult(c.source));
    // Merge status
    Object.assign(providerStatus, fallbackExec.providerStatus);
  } else {
    for (const fb of plan.fallbackProviders) {
       providerStatus[fb] = { status: 'fallback_not_needed' };
    }
  }

  // 6. Finalize Canonical Sources
  const finalResults: ResearchResult[] = [];
  for (const group of groups) {
    const { source, provenance } = mergeSources(group);
    const integrity = buildIntegrity(source, provenance.providers, query);
    finalResults.push({ source, provenance, integrity });
  }

  // Rank / Sort (roughly by relevance and family appropriateness if desired)
  const scoreMap: Record<string, number> = { 'high': 3, 'medium': 2, 'low': 1, 'unknown': 0 };
  finalResults.sort((a, b) => scoreMap[b.integrity.relevance.status] - scoreMap[a.integrity.relevance.status]);

  // Backward compatibility format for providerStatus strings
  const formattedStatus: Record<string, string> = {};
  for (const [k, v] of Object.entries(providerStatus)) {
    formattedStatus[k] = v.error ? v.error : v.status;
  }

  return { results: finalResults, providerStatus: formattedStatus, plan };
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

  if (!crossrefResult) {
    try {
      openalexResult = await lookupOpenAlexByDoi(doi);
    } catch (e: any) {
      providerStatus.openalex = e.message || 'error';
    }
  }

  if (!crossrefResult && !openalexResult) {
    return { result: null, providerStatus };
  }

  const sourcesToMerge = [];
  if (crossrefResult) sourcesToMerge.push(crossrefResult);
  if (openalexResult) sourcesToMerge.push(openalexResult);

  const { source, provenance } = mergeSources(sourcesToMerge);
  const integrity = buildIntegrity(source, provenance.providers, expectedTitle || '');
  return { result: { source, provenance, integrity }, providerStatus };
}
