import { NormalizedSource, SourceAuthor, SourceIdentifier, SourceLocation } from '../../sources/types';

const ARXIV_API_URL = 'http://export.arxiv.org/api/query';
const USER_AGENT = 'Verba/1.0 (contact@verba.local)';

export async function searchArxiv(query: string, maxResults: number = 10): Promise<NormalizedSource[]> {
  try {
    const url = new URL(ARXIV_API_URL);
    url.searchParams.append('search_query', `all:${query}`);
    url.searchParams.append('start', '0');
    url.searchParams.append('max_results', maxResults.toString());

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout for rate discipline
    });

    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
         console.warn(`arXiv API rate limit or auth error: ${res.status}`);
         return [];
      }
      throw new Error(`arXiv API error: ${res.status} ${res.statusText}`);
    }

    const xmlText = await res.text();
    
    // Simple XML parser via regex since we don't have a DOM parser
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    const entries: string[] = [];
    let match;
    while ((match = entryRegex.exec(xmlText)) !== null) {
      entries.push(match[1]);
    }

    if (entries.length === 0) {
      return [];
    }

    return entries.map((entryStr: string): NormalizedSource | null => {
      try {
        const getTagContent = (regex: RegExp) => {
          const m = regex.exec(entryStr);
          return m ? m[1].trim() : null;
        };

        const title = getTagContent(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/);
        if (!title) return null;

        const summary = getTagContent(/<summary(?:\s[^>]*)?>([\s\S]*?)<\/summary>/);
        const publishedDateStr = getTagContent(/<published(?:\s[^>]*)?>([\s\S]*?)<\/published>/);
        const publicationYear = publishedDateStr ? parseInt(publishedDateStr.substring(0, 4), 10) : null;
        
        const idUrl = getTagContent(/<id>([\s\S]*?)<\/id>/);
        let arxivIdBase = null;
        let arxivIdFull = null;
        
        if (idUrl) {
          // http://arxiv.org/abs/2110.01831v1 -> 2110.01831v1
          const matchId = idUrl.match(/arxiv\.org\/abs\/([^\s]+)/);
          if (matchId) {
            arxivIdFull = matchId[1];
            // Remove version suffix for canonical identity
            arxivIdBase = arxivIdFull.replace(/v\d+$/, '');
          }
        }

        const doi = getTagContent(/<arxiv:doi(?:\s[^>]*)?>([\s\S]*?)<\/arxiv:doi>/);

        const authors: SourceAuthor[] = [];
        const authorRegex = /<author>\s*<name>([^<]+)<\/name>[\s\S]*?<\/author>/g;
        let authorMatch;
        while ((authorMatch = authorRegex.exec(entryStr)) !== null) {
          const name = authorMatch[1].trim();
          const parts = name.split(' ');
          const family = parts.pop() || '';
          const given = parts.join(' ');
          authors.push({ given, family });
        }

        const identifiers: SourceIdentifier[] = [];
        if (arxivIdBase) {
          identifiers.push({
            identifier_type: 'arxiv',
            identifier_value: arxivIdBase,
            normalized_value: arxivIdBase,
            is_primary: true
          });
        }
        
        if (doi) {
          const cleanDoi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim();
          identifiers.push({
            identifier_type: 'doi',
            identifier_value: cleanDoi,
            normalized_value: cleanDoi,
            is_primary: false // arXiv identifier is primary for this preprint
          });
        }

        const locations: SourceLocation[] = [];
        if (arxivIdBase) {
          locations.push({
            location_type: 'repository',
            url: `https://arxiv.org/abs/${arxivIdBase}`,
            access_status: 'unknown',
            content_type: 'landing_page', // Represents a preview/abstract page
            provider: 'arxiv',
            is_primary: true
          });
          
          locations.push({
            location_type: 'repository',
            url: `https://arxiv.org/pdf/${arxivIdBase}.pdf`,
            access_status: 'open',
            content_type: 'pdf',
            provider: 'arxiv',
            is_primary: false
          });
        }

        const source: NormalizedSource = {
          source_type: 'preprint',
          title: title.replace(/\s+/g, ' ').trim(), // collapse newlines in title
          authors: authors,
          publication_year: publicationYear,
          container_title: 'arXiv',
          publisher: 'arXiv',
          volume: null,
          issue: null,
          pages: null,
          doi: doi ? doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim() : null,
          url: arxivIdBase ? `https://arxiv.org/abs/${arxivIdBase}` : null,
          abstract: summary ? summary.replace(/\s+/g, ' ').trim() : null, // collapse newlines
          source_provider: 'arxiv',
          metadata: {
            arxiv_version_id: arxivIdFull,
            published_date: publishedDateStr
          },
          identifiers: identifiers.length > 0 ? identifiers : undefined,
          locations: locations.length > 0 ? locations : undefined
        };

        return source;
      } catch (err) {
        console.warn('Failed to parse arXiv item', err);
        return null;
      }
    }).filter((s: NormalizedSource | null) => s !== null) as NormalizedSource[];

  } catch (error: any) {
    if (error.name === 'TimeoutError') {
       console.error('arXiv Provider Error: Request timed out');
    } else {
       console.error('arXiv Provider Error:', error.message);
    }
    // Provider fails independently
    return [];
  }
}
