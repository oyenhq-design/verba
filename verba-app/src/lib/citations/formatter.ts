import { NormalizedSource } from '../sources/types';

export type CitationStyle = 'apa' | 'ieee' | 'harvard' | 'chicago-author-date' | 'mla';

// Ensure style is normalized to one of our supported ones
export function normalizeCitationStyle(style: string | null | undefined): CitationStyle {
  if (!style) return 'apa';
  const normalized = style.trim().toLowerCase();
  if (['apa', 'ieee', 'harvard', 'chicago-author-date', 'mla'].includes(normalized)) {
    return normalized as CitationStyle;
  }
  return 'apa';
}

function formatAuthorNamesAPA(authors: { given: string; family: string }[]): string {
  if (!authors || authors.length === 0) return 'Unknown Author';
  
  const formatName = (a: { given: string; family: string }) => {
    const givenInitials = a.given.split(' ').map(n => n.charAt(0).toUpperCase() + '.').join(' ');
    return `${a.family}, ${givenInitials}`;
  };

  if (authors.length === 1) return formatName(authors[0]);
  if (authors.length === 2) return `${formatName(authors[0])} & ${formatName(authors[1])}`;
  
  if (authors.length > 2 && authors.length <= 20) {
    const allButLast = authors.slice(0, -1).map(formatName).join(', ');
    const last = formatName(authors[authors.length - 1]);
    return `${allButLast}, & ${last}`;
  }
  
  if (authors.length > 20) {
    const first19 = authors.slice(0, 19).map(formatName).join(', ');
    const last = formatName(authors[authors.length - 1]);
    return `${first19}, ... ${last}`;
  }
  
  return 'Unknown Author';
}

function formatInlineAuthorNamesAPA(authors: { given: string; family: string }[]): string {
  if (!authors || authors.length === 0) return 'Unknown';
  if (authors.length === 1) return authors[0].family;
  if (authors.length === 2) return `${authors[0].family} & ${authors[1].family}`;
  return `${authors[0].family} et al.`;
}

function formatAuthorNamesIEEE(authors: { given: string; family: string }[]): string {
  if (!authors || authors.length === 0) return 'Unknown Author';
  
  const formatName = (a: { given: string; family: string }) => {
    const givenInitials = a.given.split(' ').map(n => n.charAt(0).toUpperCase() + '.').join(' ');
    return `${givenInitials} ${a.family}`;
  };

  if (authors.length === 1) return formatName(authors[0]);
  if (authors.length === 2) return `${formatName(authors[0])} and ${formatName(authors[1])}`;
  if (authors.length >= 3 && authors.length <= 6) {
    const allButLast = authors.slice(0, -1).map(formatName).join(', ');
    const last = formatName(authors[authors.length - 1]);
    return `${allButLast}, and ${last}`;
  }
  if (authors.length > 6) {
    return `${formatName(authors[0])} et al.`;
  }
  
  return 'Unknown Author';
}

export function formatInlineCitation(
  source: NormalizedSource | null, 
  style: CitationStyle, 
  index?: number
): string {
  if (!source) return '[Unknown Source]';

  const normalizedStyle = normalizeCitationStyle(style);
  
  if (normalizedStyle === 'ieee') {
    return `[${index ?? '?'}]`;
  }

  // Default to APA
  const authorStr = formatInlineAuthorNamesAPA(source.authors);
  const yearStr = source.publication_year || 'n.d.';
  return `(${authorStr}, ${yearStr})`;
}

export function formatBibliographyEntry(
  source: NormalizedSource | null, 
  style: CitationStyle,
  index?: number
): string {
  if (!source) return 'Unknown Source';

  const normalizedStyle = normalizeCitationStyle(style);

  if (normalizedStyle === 'ieee') {
    const authorStr = formatAuthorNamesIEEE(source.authors);
    const title = source.title ? `"${source.title},"` : '';
    const container = source.container_title ? ` in *${source.container_title}*,` : '';
    const vol = source.volume ? ` vol. ${source.volume},` : '';
    const issue = source.issue ? ` no. ${source.issue},` : '';
    const pages = source.pages ? ` pp. ${source.pages},` : '';
    const year = source.publication_year ? ` ${source.publication_year}.` : '';
    
    // Simplistic IEEE
    return `[${index ?? '?'}] ${authorStr}, ${title}${container}${vol}${issue}${pages}${year}`.replace(/\s+/g, ' ').trim();
  }

  // Default APA
  const authorStr = formatAuthorNamesAPA(source.authors);
  const yearStr = source.publication_year ? `(${source.publication_year})` : '(n.d.)';
  const title = source.title ? `${source.title}.` : '';
  const container = source.container_title ? `*${source.container_title}*,` : '';
  const volIssue = source.volume ? ` ${source.volume}${source.issue ? `(${source.issue})` : ''},` : '';
  const pages = source.pages ? ` ${source.pages}.` : '';
  const doi = source.doi ? ` https://doi.org/${source.doi}` : '';

  return `${authorStr} ${yearStr}. ${title} ${container}${volIssue}${pages}${doi}`.replace(/\s+/g, ' ').trim();
}

export function sortBibliography(sources: NormalizedSource[], style: CitationStyle): NormalizedSource[] {
  const normalizedStyle = normalizeCitationStyle(style);
  
  if (normalizedStyle === 'ieee') {
    // IEEE is sorted by citation order. We assume the array passed in is already in citation order.
    return [...sources]; 
  }

  // APA is sorted alphabetically by authors
  return [...sources].sort((a, b) => {
    const aAuthor = a.authors?.[0]?.family || a.title || '';
    const bAuthor = b.authors?.[0]?.family || b.title || '';
    return aAuthor.localeCompare(bAuthor);
  });
}
