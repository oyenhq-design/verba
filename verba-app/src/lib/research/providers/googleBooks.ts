import { NormalizedSource, SourceAuthor, SourceIdentifier, SourceLocation, SourceProvider } from '../../sources/types';

const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';

export async function searchGoogleBooks(query: string, maxResults: number = 10): Promise<NormalizedSource[]> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) {
    // Graceful degradation if key is absent
    console.warn('GOOGLE_BOOKS_API_KEY is missing. Skipping Google Books provider.');
    throw new Error('disabled_missing_configuration');
  }

  try {
    const url = new URL(GOOGLE_BOOKS_API_URL);
    url.searchParams.append('q', query);
    url.searchParams.append('maxResults', maxResults.toString());
    url.searchParams.append('key', apiKey);

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
      if (res.status === 503) {
        // One short retry for transient 503s
        await new Promise(r => setTimeout(r, 500));
        res = await fetch(url.toString(), {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(10000)
        });
      }
    } catch (fetchErr: any) {
      if (fetchErr.name === 'TimeoutError') {
        throw new Error('Request timed out');
      }
      throw fetchErr;
    }

    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
         console.warn(`Google Books API rate limit or auth error: ${res.status}`);
         throw new Error(`rate limit or auth error: ${res.status}`);
      }
      throw new Error(`Google Books API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map((item: any): NormalizedSource | null => {
      try {
        const volumeInfo = item.volumeInfo || {};
        const title = volumeInfo.title;
        if (!title) return null;

        // Parse authors
        const authors: SourceAuthor[] = (volumeInfo.authors || []).map((name: string) => {
          const parts = name.trim().split(' ');
          const family = parts.pop() || '';
          const given = parts.join(' ');
          return { given, family };
        });

        // Parse year
        let year = null;
        if (volumeInfo.publishedDate) {
          const match = volumeInfo.publishedDate.match(/^(\d{4})/);
          if (match) year = parseInt(match[1], 10);
        }

        // Parse identifiers (ISBN-10, ISBN-13)
        const identifiers: SourceIdentifier[] = [];
        if (volumeInfo.industryIdentifiers) {
          volumeInfo.industryIdentifiers.forEach((id: any) => {
            if (id.type === 'ISBN_13' || id.type === 'ISBN_10') {
              const val = id.identifier.replace(/-/g, '').trim();
              if (val) {
                identifiers.push({
                  identifier_type: 'isbn',
                  identifier_value: val,
                  normalized_value: val,
                  is_primary: id.type === 'ISBN_13' // Prefer ISBN-13 as primary
                });
              }
            }
          });
        }
        
        // Ensure only one is marked primary
        if (identifiers.length > 0) {
           const hasPrimary = identifiers.some(i => i.is_primary);
           if (!hasPrimary) identifiers[0].is_primary = true;
           // If multiple are primary, keep first
           let foundPrimary = false;
           identifiers.forEach(i => {
              if (i.is_primary) {
                 if (foundPrimary) i.is_primary = false;
                 else foundPrimary = true;
              }
           });
        }

        // Parse locations
        const locations: SourceLocation[] = [];
        // Info Link
        if (volumeInfo.infoLink) {
          locations.push({
            location_type: 'source_page',
            url: volumeInfo.infoLink,
            access_status: 'unknown',
            content_type: 'metadata',
            provider: 'google_books',
            is_primary: true
          });
        }
        // Preview Link
        if (volumeInfo.previewLink) {
          locations.push({
            location_type: 'source_page',
            url: volumeInfo.previewLink,
            access_status: 'unknown',
            content_type: 'landing_page', // Represents a preview page
            provider: 'google_books',
            is_primary: false
          });
        }

        const source: NormalizedSource = {
          source_type: 'book',
          title: title,
          authors: authors,
          publication_year: year,
          container_title: null,
          publisher: volumeInfo.publisher || null,
          volume: null,
          issue: null,
          pages: volumeInfo.pageCount ? volumeInfo.pageCount.toString() : null,
          doi: null,
          url: volumeInfo.infoLink || null,
          abstract: volumeInfo.description || null,
          source_provider: 'google_books',
          metadata: {
            google_books_id: item.id,
            language: volumeInfo.language || null,
            categories: volumeInfo.categories || []
          },
          identifiers: identifiers.length > 0 ? identifiers : undefined,
          locations: locations.length > 0 ? locations : undefined
        };

        return source;
      } catch (err) {
        console.warn('Failed to parse Google Books item', err);
        return null;
      }
    }).filter((s: NormalizedSource | null) => s !== null) as NormalizedSource[];

  } catch (error: any) {
    console.error('Google Books Provider Error:', error.message);
    throw error;
  }
}
