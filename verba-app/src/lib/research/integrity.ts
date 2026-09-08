import { NormalizedSource, SourceProvider } from '../sources/types';
import { normalizeTitle, normalizeDoi } from '../sources/normalize';
import { 
  SourceIntegrity, SourceIdentity, IdentityStatus, RelevanceStatus, 
  EvidenceStatus, AccessStatus, RetractionStatus, FieldIdentity 
} from './types';

export function calculateIdentity(
  source: NormalizedSource, 
  providers: SourceProvider[],
  expectedDoi?: string,
  expectedTitle?: string
): SourceIdentity {
  
  const reasons: string[] = [];
  let status: IdentityStatus = 'unverified';
  
  const fields = {
    doi: 'missing' as FieldIdentity,
    title: 'missing' as FieldIdentity,
    authors: 'missing' as FieldIdentity,
    year: 'missing' as FieldIdentity,
    container: 'missing' as FieldIdentity,
  };

  if (source.doi) fields.doi = 'match';
  if (source.title) fields.title = 'match';
  if (source.authors && source.authors.length > 0) fields.authors = 'match';
  if (source.publication_year) fields.year = 'match';
  if (source.container_title) fields.container = 'match';

  // Mode B: Claimed Metadata Verification
  if (expectedDoi || expectedTitle) {
    let hasConflict = false;
    
    if (expectedDoi) {
      if (source.doi && normalizeDoi(source.doi) === normalizeDoi(expectedDoi)) {
        fields.doi = 'match';
      } else if (source.doi) {
        fields.doi = 'conflict';
        hasConflict = true;
        reasons.push(`DOI mismatch: expected ${expectedDoi}, got ${source.doi}`);
      } else {
        fields.doi = 'missing';
      }
    }
    
    if (expectedTitle) {
      if (source.title) {
        const normActual = normalizeTitle(source.title).toLowerCase();
        const normExpected = normalizeTitle(expectedTitle).toLowerCase();
        if (normActual === normExpected) {
          fields.title = 'match';
        } else if (normActual.includes(normExpected) || normExpected.includes(normActual)) {
          fields.title = 'partial';
        } else {
          fields.title = 'conflict';
          hasConflict = true;
          reasons.push(`Title mismatch: expected "${expectedTitle}", got "${source.title}"`);
        }
      }
    }

    if (hasConflict) {
      status = 'conflict';
    } else if (fields.doi === 'match' && fields.title === 'match') {
      status = 'confirmed';
    } else {
      status = 'partial';
    }
  } 
  // Mode A: Search Result Identity (No expected baseline)
  else {
    if (providers.length >= 2) {
      status = 'confirmed';
      reasons.push(`Identity confirmed by multiple providers (${providers.join(', ')})`);
    } else {
      status = 'partial';
      reasons.push(`Identity relies on a single provider (${providers[0] || 'none'})`);
    }
  }

  return {
    status,
    fields,
    agreement: providers,
    reasons
  };
}

export function calculateRelevance(source: NormalizedSource, query: string): { status: RelevanceStatus, reasons: string[] } {
  const qTokens = query.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(t => t.length > 2);
  if (qTokens.length === 0) return { status: 'unknown', reasons: [] };

  const reasons: string[] = [];
  let score = 0;

  const tTokens = source.title ? source.title.toLowerCase().split(/\s+/) : [];
  const titleMatches = qTokens.filter(q => tTokens.some(t => t.includes(q) || q.includes(t)));
  if (titleMatches.length > 0) {
    score += titleMatches.length * 3;
    reasons.push(`Title matches: ${titleMatches.join(', ')}`);
  }

  if (source.abstract) {
    const aTokens = source.abstract.toLowerCase().split(/\s+/);
    const absMatches = qTokens.filter(q => aTokens.some(a => a.includes(q) || q.includes(a)));
    if (absMatches.length > 0) {
      score += absMatches.length * 2;
      reasons.push(`Abstract matches: ${absMatches.join(', ')}`);
    }
  }

  const topics = source.metadata?.topics as string[] | undefined;
  if (topics && topics.length > 0) {
    const topicMatches = qTokens.filter(q => topics.some(t => t.toLowerCase().includes(q)));
    if (topicMatches.length > 0) {
      score += topicMatches.length * 2;
      reasons.push(`Topic matches: ${topicMatches.join(', ')}`);
    }
  }

  let status: RelevanceStatus = 'unknown';
  if (score >= qTokens.length * 2) status = 'high';
  else if (score >= qTokens.length) status = 'medium';
  else if (score > 0) status = 'low';
  else status = 'low';

  return { status, reasons };
}

export function calculateEvidence(source: NormalizedSource): EvidenceStatus {
  // Check lawful full text signals from OpenAlex metadata
  if (source.metadata?.open_access) {
    const oa = source.metadata.open_access as any;
    if (oa.is_oa && oa.oa_url) return 'full_text_available';
  }
  
  if (source.abstract) return 'abstract_available';
  
  return 'metadata_only';
}

export function extractAccess(source: NormalizedSource): { status: AccessStatus, landing_page_url: string | null, pdf_url: string | null } {
  let status: AccessStatus = 'unknown';
  let landing_page_url = source.url || null;
  let pdf_url = null;

  if (source.metadata?.open_access) {
    const oa = source.metadata.open_access as any;
    if (oa.is_oa) {
      status = 'open';
      if (oa.oa_url) {
        // Validate URL
        try {
          const u = new URL(oa.oa_url);
          if (u.protocol === 'http:' || u.protocol === 'https:') {
            if (oa.oa_url.toLowerCase().endsWith('.pdf')) {
              pdf_url = oa.oa_url;
            } else {
              landing_page_url = oa.oa_url;
            }
          }
        } catch (e) {}
      }
    } else {
      status = 'closed';
    }
  }

  return { status, landing_page_url, pdf_url };
}

export function extractRetraction(source: NormalizedSource): RetractionStatus {
  if (source.metadata?.is_retracted === true) {
    return 'retracted';
  }
  if (source.metadata?.is_retracted === false) {
    return 'none_known';
  }
  return 'unknown';
}

export function buildIntegrity(source: NormalizedSource, providers: SourceProvider[], query: string, expectedDoi?: string, expectedTitle?: string): SourceIntegrity {
  return {
    identity: calculateIdentity(source, providers, expectedDoi, expectedTitle),
    relevance: calculateRelevance(source, query),
    evidence_availability: calculateEvidence(source),
    access: extractAccess(source),
    retraction: extractRetraction(source)
  };
}
