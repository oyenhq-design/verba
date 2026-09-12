import { NormalizedSource, SourceAuthor, SourceIdentifier, SourceLocation, SourceType } from '../../sources/types';

const SERPER_API_URL = 'https://google.serper.dev/search';
const SERPER_MAX_RESULTS = 3;

export async function searchSerper(query: string): Promise<NormalizedSource[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return []; // Gracefully disable if no key
  }

  try {
    const res = await fetch(SERPER_API_URL, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        num: SERPER_MAX_RESULTS + 2 // Fetch a couple extra to filter
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403 || res.status === 429) {
        console.warn(`Serper API auth or rate limit error: ${res.status}`);
        return [];
      }
      throw new Error(`Serper API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const organics = data.organic || [];

    if (!organics || organics.length === 0) {
      return [];
    }

    const results: NormalizedSource[] = [];

    for (const item of organics) {
      if (results.length >= SERPER_MAX_RESULTS) break;

      const title = item.title;
      const url = item.link;
      const snippet = item.snippet;
      if (!title || !url) continue;

      // Source classification heuristic
      let sourceType: SourceType = 'website'; // conservative default
      const lowerUrl = url.toLowerCase();
      const lowerTitle = title.toLowerCase();
      const lowerSnippet = (snippet || '').toLowerCase();

      // Strong Thesis heuristic
      if (
        (lowerUrl.includes('.edu') || lowerUrl.includes('repository.') || lowerUrl.includes('etd.')) &&
        (lowerTitle.includes('thesis') || lowerTitle.includes('dissertation') || lowerSnippet.includes('thesis') || lowerSnippet.includes('dissertation'))
      ) {
        sourceType = 'thesis';
      } 
      // Strong Government Report heuristic
      else if (
        lowerUrl.includes('.gov') &&
        (lowerTitle.includes('report') || lowerSnippet.includes('report') || lowerUrl.includes('document') || lowerTitle.includes('regulation') || lowerTitle.includes('policy'))
      ) {
        sourceType = 'government_report' as SourceType; // Fallback to 'report' if 'government_report' is not valid
      } 
      // Institutional/Technical report heuristic
      else if (
        lowerTitle.includes('technical report') || lowerSnippet.includes('technical report')
      ) {
        sourceType = 'technical_report' as SourceType;
      } else if (
        lowerTitle.includes('institutional report')
      ) {
        sourceType = 'institutional_report' as SourceType;
      } else if (lowerTitle.includes('preprint') || lowerUrl.includes('arxiv.org')) {
         sourceType = 'preprint';
      } else if (lowerUrl.includes('.edu') || lowerUrl.includes('.gov')) {
         // Keep it as website or other if we aren't confident
         sourceType = 'website' as SourceType;
      }

      // Check types since some types may not be in SourceType union
      const validTypes = ['journal_article', 'conference_paper', 'book', 'book_chapter', 'thesis', 'report', 'website', 'dataset', 'standard', 'preprint', 'other'];
      if (!validTypes.includes(sourceType) && sourceType !== 'website') {
         if (sourceType.includes('report')) sourceType = 'report';
         else sourceType = 'other';
      }
      if (sourceType === 'website' && !validTypes.includes('website')) {
         sourceType = 'website';
      }

      const locations: SourceLocation[] = [];
      const isPdf = lowerUrl.endsWith('.pdf');
      
      if (isPdf) {
        locations.push({
          location_type: 'full_text',
          url: url,
          access_status: 'open',
          content_type: 'pdf',
          provider: 'serper',
          is_primary: true
        });
      } else {
        locations.push({
          location_type: 'source_page',
          url: url,
          access_status: 'unknown',
          content_type: 'landing_page',
          provider: 'serper',
          is_primary: true
        });
      }

      // Try to parse basic identifiers if they exist in the URL
      const identifiers: SourceIdentifier[] = [];
      
      // Basic DOI extractor from URL
      const doiMatch = url.match(/doi\.org\/(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i);
      if (doiMatch) {
         identifiers.push({
            identifier_type: 'doi',
            identifier_value: doiMatch[1],
            normalized_value: doiMatch[1],
            is_primary: true
         });
      }

      // URL itself serves as an identifier for web discoveries if no DOI
      if (identifiers.length === 0) {
         identifiers.push({
            identifier_type: 'url',
            identifier_value: url,
            normalized_value: url,
            is_primary: true
         });
      }

      results.push({
        source_type: sourceType,
        title: title,
        authors: [], // Difficult to extract reliably from Serper snippets
        publication_year: null, // Hard to extract without hallucinating
        container_title: null,
        publisher: null,
        volume: null,
        issue: null,
        pages: null,
        doi: doiMatch ? doiMatch[1] : null,
        url: url,
        abstract: null, // snippet is NOT an abstract
        source_provider: 'serper',
        metadata: {
          snippet: snippet,
          serper_position: item.position
        },
        identifiers: identifiers,
        locations: locations
      });
    }

    return results;

  } catch (error: any) {
    if (error.name === 'TimeoutError') {
       console.error('Serper Provider Error: Request timed out');
    } else {
       console.error('Serper Provider Error:', error.message);
    }
    return [];
  }
}
