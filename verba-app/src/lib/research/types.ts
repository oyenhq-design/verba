import { NormalizedSource, SourceProvider } from '../sources/types';

export type IdentityStatus = 'confirmed' | 'partial' | 'conflict' | 'not_found' | 'unverified';
export type RelevanceStatus = 'high' | 'medium' | 'low' | 'unknown';
export type EvidenceStatus = 'not_checked' | 'metadata_only' | 'abstract_available' | 'full_text_available';
export type AccessStatus = 'open' | 'closed' | 'unknown';
export type RetractionStatus = 'none_known' | 'retracted' | 'corrected' | 'expression_of_concern' | 'unknown';

export type FieldIdentity = 'match' | 'partial' | 'conflict' | 'missing';

export interface SourceIdentity {
  status: IdentityStatus;
  fields: {
    doi: FieldIdentity;
    title: FieldIdentity;
    authors: FieldIdentity;
    year: FieldIdentity;
    container: FieldIdentity;
  };
  agreement: SourceProvider[];
  reasons: string[];
}

export interface SourceIntegrity {
  identity: SourceIdentity;
  relevance: {
    status: RelevanceStatus;
    reasons: string[];
  };
  evidence_availability: EvidenceStatus;
  access: {
    status: AccessStatus;
    landing_page_url: string | null;
    pdf_url: string | null;
  };
  retraction: RetractionStatus;
}

export interface ProviderProvenance {
  providers: SourceProvider[];
  provider_ids: Record<string, string>;
  provider_fields: Record<string, any>;
}

export interface ResearchResult {
  source: NormalizedSource;
  integrity: SourceIntegrity;
  provenance: ProviderProvenance;
  
  // Optional fields added during Evidence Mode
  fit?: string;
  relationship?: string;
  conversationalText?: string;
  matchedAspects?: string[];
  unmatchedAspects?: string[];
}
