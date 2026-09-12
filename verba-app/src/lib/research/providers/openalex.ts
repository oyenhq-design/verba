import { NormalizedSource, SourceAuthor } from '../../sources/types';
import { normalizeDoi, normalizeTitle } from '../../sources/normalize';

const OPENALEX_API_URL = 'https://api.openalex.org/works';
const USER_AGENT = 'mailto:oyenhq@gmail.com';

function mapOpenAlexType(type: string): NormalizedSource['source_type'] {
  const map: Record<string, NormalizedSource['source_type']> = {
    'article': 'journal_article',
    'proceedings-article': 'conference_paper',
    'book': 'book',
    'book-chapter': 'book_chapter',
    'dissertation': 'thesis',
    'report': 'report',
    'dataset': 'dataset',
    'standard': 'standard',
  };
  return map[type] || 'other';
}

function reconstructAbstract(invertedIndex: Record<string, number[]> | null): string | null {
  if (!invertedIndex) return null;
  try {
    // Find max position to size the array
    let maxPos = -1;
    for (const positions of Object.values(invertedIndex)) {
      for (const pos of positions) {
        if (pos > maxPos) maxPos = pos;
      }
    }
    if (maxPos === -1) return null;

    const words = new Array(maxPos + 1).fill('');
    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const pos of positions) {
        words[pos] = word;
      }
    }
    return words.join(' ').trim();
  } catch (e) {
    console.error("Failed to reconstruct abstract", e);
    return null;
  }
}

function parseOpenAlexItem(item: any): NormalizedSource {
  const title = item.title ? normalizeTitle(item.title) : 'Untitled';
  
  const authors: SourceAuthor[] = [];
  if (item.authorships) {
    for (const a of item.authorships) {
      if (a.author && a.author.display_name) {
        const parts = a.author.display_name.trim().split(' ');
        if (parts.length === 1) {
          authors.push({ given: '', family: parts[0] });
        } else {
          const family = parts.pop() || '';
          const given = parts.join(' ');
          authors.push({ given, family });
        }
      }
    }
  }

  const identifiers: any[] = [];
  const locations: any[] = [];

  const normDoi = normalizeDoi(item.doi);
  if (normDoi) {
    identifiers.push({
      identifier_type: 'doi',
      identifier_value: item.doi,
      normalized_value: normDoi,
      is_primary: true
    });
  }

  if (item.ids) {
    if (item.ids.pmid) {
      identifiers.push({
        identifier_type: 'pmid',
        identifier_value: item.ids.pmid.replace('https://pubmed.ncbi.nlm.nih.gov/', ''),
        normalized_value: item.ids.pmid.replace('https://pubmed.ncbi.nlm.nih.gov/', ''),
        is_primary: false
      });
    }
  }

  if (item.primary_location && item.primary_location.landing_page_url) {
    const isOa = item.primary_location.is_oa === true;
    locations.push({
      location_type: normDoi ? 'doi_landing_page' : 'source_page',
      url: item.primary_location.landing_page_url,
      access_status: isOa ? 'open' : (item.primary_location.is_oa === false ? 'closed' : 'unknown'),
      content_type: item.primary_location.pdf_url ? 'pdf' : 'landing_page',
      provider: item.primary_location.source?.host_organization_name || 'openalex',
      is_primary: true
    });
    if (item.primary_location.pdf_url) {
       locations.push({
         location_type: 'repository',
         url: item.primary_location.pdf_url,
         access_status: 'open',
         content_type: 'pdf',
         provider: item.primary_location.source?.host_organization_name || 'openalex',
         is_primary: false
       });
    }
  }

  const container_title = item.primary_location?.source?.display_name || null;
  const publisher = item.primary_location?.source?.host_organization_name || null;

  const abstract = item.abstract_inverted_index ? reconstructAbstract(item.abstract_inverted_index) : null;
  
  // Extract topics/concepts
  const topics = [];
  if (item.topics) {
    for (const t of item.topics) {
      if (t.display_name) topics.push(t.display_name);
    }
  }
  if (item.concepts) {
    for (const c of item.concepts) {
      if (c.display_name) topics.push(c.display_name);
    }
  }

  return {
    source_type: mapOpenAlexType(item.type),
    title,
    authors,
    publication_year: item.publication_year || null,
    container_title,
    publisher,
    volume: item.biblio?.volume || null,
    issue: item.biblio?.issue || null,
    pages: (item.biblio?.first_page && item.biblio?.last_page) ? `${item.biblio.first_page}-${item.biblio.last_page}` : item.biblio?.first_page || null,
    doi: normDoi || null,
    url: item.primary_location?.landing_page_url || item.doi || null,
    abstract,
    source_provider: 'openalex',
    metadata: {
      cited_by_count: item.cited_by_count,
      open_access: item.open_access,
      is_retracted: item.is_retracted,
      topics: topics,
      openalex_id: item.id
    },
    identifiers,
    locations
  };
}

export async function lookupOpenAlexByDoi(doi: string, timeoutMs = 5000): Promise<NormalizedSource | null> {
  const normalized = normalizeDoi(doi);
  if (!normalized) return null;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const params = new URLSearchParams({
      mailto: USER_AGENT,
    });
    
    if (process.env.OPENALEX_API_KEY) {
      params.set('api_key', process.env.OPENALEX_API_KEY);
    }
    
    const url = `${OPENALEX_API_URL}/doi:${encodeURIComponent(normalized)}?${params.toString()}`;
    const res = await fetch(url, { signal: controller.signal });
    
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`OpenAlex API error: ${res.status}`);
    }

    const data = await res.json();
    return parseOpenAlexItem(data);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn(`OpenAlex lookup timeout for DOI: ${doi}`);
    } else {
      console.error(`OpenAlex lookup error for DOI: ${doi}`, error.message);
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}

export async function searchOpenAlex(query: string, limit = 5, timeoutMs = 8000): Promise<NormalizedSource[]> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // OpenAlex uses 'search' or 'default.search' for general queries
    const params = new URLSearchParams({
      search: query,
      'per-page': limit.toString(),
      mailto: USER_AGENT,
    });
    
    if (process.env.OPENALEX_API_KEY) {
      params.set('api_key', process.env.OPENALEX_API_KEY);
    }
    
    const url = `${OPENALEX_API_URL}?${params.toString()}`;
    const res = await fetch(url, { signal: controller.signal });
    
    if (!res.ok) {
      throw new Error(`OpenAlex search error: ${res.status}`);
    }

    const data = await res.json();
    if (!data || !data.results) return [];

    return data.results.map(parseOpenAlexItem);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn(`OpenAlex search timeout for query: ${query}`);
    } else {
      console.error(`OpenAlex search error:`, error.message);
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}
