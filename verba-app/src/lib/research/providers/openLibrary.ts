import { NormalizedSource, SourceAuthor, SourceIdentifier, SourceLocation } from '../../sources/types';

const OPEN_LIBRARY_API_URL = 'https://openlibrary.org/search.json';
const USER_AGENT = 'Verba/1.0 (contact@verba.local)';

export async function searchOpenLibrary(query: string, maxResults: number = 10): Promise<NormalizedSource[]> {
  try {
    const url = new URL(OPEN_LIBRARY_API_URL);
    url.searchParams.append('q', query);
    url.searchParams.append('limit', maxResults.toString());
    url.searchParams.append('fields', 'key,title,author_name,first_publish_year,publisher,isbn,language,subject,seed');

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': USER_AGENT
      }
    });

    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
         console.warn(`Open Library API rate limit or auth error: ${res.status}`);
         return [];
      }
      throw new Error(`Open Library API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.docs || data.docs.length === 0) {
      return [];
    }

    return data.docs.map((item: any): NormalizedSource | null => {
      try {
        const title = item.title;
        if (!title) return null;

        // Parse authors
        const authors: SourceAuthor[] = (item.author_name || []).map((name: string) => {
          const parts = name.trim().split(' ');
          const family = parts.pop() || '';
          const given = parts.join(' ');
          return { given, family };
        });

        // Parse identifiers (ISBNs)
        const identifiers: SourceIdentifier[] = [];
        if (item.isbn && Array.isArray(item.isbn)) {
          // OpenLibrary can return dozens of ISBNs for different editions. 
          // We take up to 5 to avoid blowing up the DB payload.
          const isbns = item.isbn.slice(0, 5);
          isbns.forEach((isbnStr: string, idx: number) => {
            const val = isbnStr.replace(/-/g, '').trim();
            if (val) {
              identifiers.push({
                identifier_type: 'isbn',
                identifier_value: val,
                normalized_value: val,
                is_primary: idx === 0 // Mark the first one as primary
              });
            }
          });
        }

        // Parse locations
        const locations: SourceLocation[] = [];
        if (item.key) {
          locations.push({
            location_type: 'source_page',
            url: `https://openlibrary.org${item.key}`,
            access_status: 'unknown',
            content_type: 'metadata',
            provider: 'open_library',
            is_primary: true
          });
        }

        const source: NormalizedSource = {
          source_type: 'book',
          title: title,
          authors: authors,
          publication_year: item.first_publish_year || null,
          container_title: null,
          publisher: item.publisher && item.publisher.length > 0 ? item.publisher[0] : null,
          volume: null,
          issue: null,
          pages: null,
          doi: null,
          url: item.key ? `https://openlibrary.org${item.key}` : null,
          abstract: null, // Search API rarely returns full descriptions
          source_provider: 'open_library',
          metadata: {
            open_library_key: item.key || null,
            language: item.language || [],
            subjects: item.subject ? item.subject.slice(0, 5) : []
          },
          identifiers: identifiers.length > 0 ? identifiers : undefined,
          locations: locations.length > 0 ? locations : undefined
        };

        return source;
      } catch (err) {
        console.warn('Failed to parse Open Library item', err);
        return null;
      }
    }).filter((s: NormalizedSource | null) => s !== null) as NormalizedSource[];

  } catch (error: any) {
    console.error('Open Library Provider Error:', error.message);
    // Provider fails independently
    return [];
  }
}
