import { z } from 'zod';
import { SourceAuthor, SourceProvider, SourceType } from './types';

// DOI Normalization: https://doi.org/10.xxxx/abc -> 10.xxxx/abc
export function normalizeDoi(doi: string | null | undefined): string | null {
  if (!doi) return null;
  let normalized = doi.trim().toLowerCase();
  
  // Remove common URL prefixes
  normalized = normalized.replace(/^https?:\/\/(dx\.)?doi\.org\//, '');
  // Remove pseudo-protocol
  normalized = normalized.replace(/^doi:/, '');
  
  // Basic sanity check for format (10.xxxx/xxxx)
  if (!normalized.startsWith('10.')) return null;
  
  return normalized;
}

export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ');
}

export function getSourceTrackId(source: any): string {
  // 1. DOI
  if (source.doi) return `doi:${normalizeDoi(source.doi)}`;
  const identifiers = source.identifiers || [];
  const getId = (type: string) => identifiers.find((i: any) => i.identifier_type === type)?.normalized_value;
  
  const doi = getId('doi');
  if (doi) return `doi:${normalizeDoi(doi)}`;

  // 2. arXiv
  const arxiv = getId('arxiv');
  if (arxiv) return `arxiv:${arxiv}`;

  // 3. PMID
  const pmid = getId('pmid');
  if (pmid) return `pmid:${pmid}`;

  // 4. PMCID
  const pmcid = getId('pmcid');
  if (pmcid) return `pmcid:${pmcid}`;

  // 5. ISBN + normalized title
  const isbn = getId('isbn');
  const normTitle = source.title ? normalizeTitle(source.title).toLowerCase() : '';
  if (isbn && normTitle) return `isbn:${isbn}:${normTitle}`;

  // 6. HANDLE
  const handle = getId('handle');
  if (handle) return `handle:${handle}`;

  // 7. normalized title + first author + year
  let firstAuthor = '';
  if (source.authors && source.authors.length > 0) {
    firstAuthor = source.authors[0].family.toLowerCase();
  }
  const year = source.publication_year || '';
  
  if (normTitle) {
    return `fallback:${normTitle}:${firstAuthor}:${year}`;
  }

  // Absolute fallback
  return `unknown:${Math.random().toString(36).substring(7)}`;
}

export const SourceSchema = z.object({
  source_type: z.enum([
    'journal_article',
    'conference_paper',
    'book',
    'book_chapter',
    'thesis',
    'report',
    'website',
    'dataset',
    'standard',
    'preprint',
    'other'
  ]),
  title: z.string().min(1, "Title is required").transform(normalizeTitle),
  authors: z.array(z.object({
    given: z.string(),
    family: z.string()
  })),
  publication_year: z.number().int().min(1).max(2200).nullable().optional(),
  container_title: z.string().nullable().optional(),
  publisher: z.string().nullable().optional(),
  volume: z.string().nullable().optional(),
  issue: z.string().nullable().optional(),
  pages: z.string().nullable().optional(),
  doi: z.string().nullable().optional().transform(val => normalizeDoi(val)),
  url: z.string().url("Invalid URL").nullable().optional().or(z.literal('')),
  abstract: z.string().nullable().optional(),
  source_provider: z.enum([
    'manual',
    'openalex',
    'crossref',
    'semantic_scholar',
    'google_books',
    'open_library',
    'arxiv',
    'serper',
    'imported'
  ]).default('manual'),
  metadata: z.record(z.string(), z.unknown()).default({}),
  identifiers: z.array(z.object({
    identifier_type: z.string(),
    identifier_value: z.string(),
    normalized_value: z.string(),
    is_primary: z.boolean()
  })).optional(),
  locations: z.array(z.object({
    location_type: z.string(),
    url: z.string(),
    access_status: z.string(),
    content_type: z.string(),
    provider: z.string().optional(),
    is_primary: z.boolean()
  })).optional()
});
