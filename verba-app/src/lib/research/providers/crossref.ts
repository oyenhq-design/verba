import { NormalizedSource, SourceAuthor } from '../../sources/types';
import { normalizeDoi, normalizeTitle } from '../../sources/normalize';

const CROSSREF_API_URL = 'https://api.crossref.org/works';
const USER_AGENT = 'VerbaResearch/1.0 (mailto:oyenhq@gmail.com)';

function mapCrossrefType(type: string): NormalizedSource['source_type'] {
  const map: Record<string, NormalizedSource['source_type']> = {
    'journal-article': 'journal_article',
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

function parseCrossrefItem(item: any): NormalizedSource {
  const title = item.title && item.title.length > 0 ? normalizeTitle(item.title[0]) : 'Untitled';
  
  const authors: SourceAuthor[] = [];
  if (item.author) {
    for (const a of item.author) {
      if (a.family) {
        authors.push({ given: a.given || '', family: a.family });
      }
    }
  }

  const identifiers: any[] = [];
  const locations: any[] = [];

  const normDoi = normalizeDoi(item.DOI);
  if (normDoi) {
    identifiers.push({
      identifier_type: 'doi',
      identifier_value: item.DOI,
      normalized_value: normDoi,
      is_primary: true
    });
  }

  if (item.ISBN && Array.isArray(item.ISBN)) {
    for (const isbn of item.ISBN) {
      // Very basic normalization for ISBN (strip dashes and spaces)
      const normIsbn = isbn.replace(/[-\s]/g, '');
      if (normIsbn) {
        identifiers.push({
          identifier_type: 'isbn',
          identifier_value: isbn,
          normalized_value: normIsbn,
          is_primary: !normDoi && identifiers.length === 0
        });
      }
    }
  }

  if (item.URL) {
    locations.push({
      location_type: normDoi ? 'doi_landing_page' : 'publisher',
      url: item.URL,
      access_status: 'unknown',
      content_type: 'landing_page',
      provider: item.publisher || 'crossref',
      is_primary: true
    });
  }

  let year: number | null = null;
  if (item.published && item.published['date-parts'] && item.published['date-parts'][0]) {
    year = item.published['date-parts'][0][0];
  } else if (item['published-print'] && item['published-print']['date-parts']) {
    year = item['published-print']['date-parts'][0][0];
  } else if (item['published-online'] && item['published-online']['date-parts']) {
    year = item['published-online']['date-parts'][0][0];
  }

  const container_title = item['container-title'] && item['container-title'].length > 0 ? item['container-title'][0] : null;

  // Sanitize abstract from jats xml markup
  let abstract = item.abstract || null;
  if (abstract) {
    abstract = abstract.replace(/<[^>]+>/g, '').trim();
  }

  return {
    source_type: mapCrossrefType(item.type),
    title,
    authors,
    publication_year: year,
    container_title,
    publisher: item.publisher || null,
    volume: item.volume || null,
    issue: item.issue || null,
    pages: item.page || null,
    doi: normDoi || null,
    url: item.URL || null,
    abstract,
    source_provider: 'crossref',
    metadata: {
      is_referenced_by_count: item['is-referenced-by-count']
    },
    identifiers,
    locations
  };
}

export async function lookupCrossrefByDoi(doi: string, timeoutMs = 5000): Promise<NormalizedSource | null> {
  const normalized = normalizeDoi(doi);
  if (!normalized) return null;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${CROSSREF_API_URL}/${encodeURIComponent(normalized)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal
    });
    
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Crossref API error: ${res.status}`);
    }

    const data = await res.json();
    if (!data || !data.message) return null;

    return parseCrossrefItem(data.message);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn(`Crossref lookup timeout for DOI: ${doi}`);
    } else {
      console.error(`Crossref lookup error for DOI: ${doi}`, error.message);
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}

export async function searchCrossref(query: string, limit = 5, timeoutMs = 8000): Promise<NormalizedSource[]> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${CROSSREF_API_URL}?query=${encodeURIComponent(query)}&rows=${limit}&select=DOI,title,author,published,published-print,published-online,container-title,abstract,type,publisher,volume,issue,page,URL,is-referenced-by-count`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal
    });
    
    if (!res.ok) {
      throw new Error(`Crossref search error: ${res.status}`);
    }

    const data = await res.json();
    if (!data || !data.message || !data.message.items) return [];

    return data.message.items.map(parseCrossrefItem);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn(`Crossref search timeout for query: ${query}`);
    } else {
      console.error(`Crossref search error:`, error.message);
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}
