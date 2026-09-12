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
  | 'preprint'
  | 'other';

export type SourceProvider =
  | 'manual'
  | 'openalex'
  | 'crossref'
  | 'semantic_scholar'
  | 'google_books'
  | 'open_library'
  | 'arxiv'
  | 'serper'
  | 'imported';

export type SourceAuthor = {
  given: string;
  family: string;
};

export type IdentifierType = 'doi' | 'isbn' | 'handle' | 'arxiv' | 'pmid' | 'pmcid' | 'url' | 'other';

export type SourceIdentifier = {
  id?: string;
  source_id?: string;
  identifier_type: IdentifierType;
  identifier_value: string;
  normalized_value: string;
  is_primary: boolean;
  created_at?: string;
};

export type AccessStatus = 'open' | 'closed' | 'unknown';
export type LocationType = 'publisher' | 'repository' | 'doi_landing_page' | 'source_page' | 'full_text';
export type ContentType = 'pdf' | 'html_full_text' | 'landing_page' | 'metadata';

export type SourceLocation = {
  id?: string;
  source_id?: string;
  location_type: LocationType;
  url: string;
  access_status: AccessStatus;
  content_type: ContentType;
  provider?: string;
  is_primary: boolean;
  created_at?: string;
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
  identifiers?: SourceIdentifier[];
  locations?: SourceLocation[];
  created_at?: string;
  updated_at?: string;
};
