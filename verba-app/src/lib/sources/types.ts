export type SourceType =
  | 'journal_article'
  | 'conference_paper'
  | 'book'
  | 'book_chapter'
  | 'thesis'
  | 'report'
  | 'website'
  | 'dataset'
  | 'standard'
  | 'other';

export type SourceProvider =
  | 'manual'
  | 'openalex'
  | 'crossref'
  | 'semantic_scholar'
  | 'imported';

export type SourceAuthor = {
  given: string;
  family: string;
};

export type NormalizedSource = {
  id?: string;
  source_type: SourceType;
  title: string;
  authors: SourceAuthor[];
  publication_year: number | null;
  container_title: string | null;
  publisher: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
  abstract: string | null;
  source_provider: SourceProvider;
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};
