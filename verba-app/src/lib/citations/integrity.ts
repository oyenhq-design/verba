import { NormalizedSource } from '../sources/types';
import { formatBibliographyEntry, CitationStyle } from './formatter';

export type CitationIntegrityResult = {
  citationId: string;
  sourceId: string | null;

  linkage: {
    status: "valid" | "broken" | "missing";
    reasons: string[];
  };

  sourceIdentity: {
    status: "confirmed" | "partial" | "conflict" | "unverified";
    reasons: string[];
  };

  bibliography: {
    status: "valid" | "warning" | "missing";
    reasons: string[];
  };

  evidenceAvailability: {
    status:
      | "not_checked"
      | "metadata_only"
      | "abstract_available"
      | "full_text_available";
  };

  claimSupport: {
    status: "not_checked";
  };

  warnings: string[];

  overall: "healthy" | "needs_review" | "critical";
};

export function evaluateCitationIntegrity(
  citationId: string,
  sourceId: string | null,
  workSources: NormalizedSource[],
  style: CitationStyle
): CitationIntegrityResult {
  const result: CitationIntegrityResult = {
    citationId,
    sourceId,
    linkage: { status: 'valid', reasons: [] },
    sourceIdentity: { status: 'unverified', reasons: [] },
    bibliography: { status: 'missing', reasons: [] },
    evidenceAvailability: { status: 'not_checked' },
    claimSupport: { status: 'not_checked' },
    warnings: [],
    overall: 'needs_review'
  };

  // 1. Linkage Check
  if (!sourceId) {
    result.linkage.status = 'missing';
    result.linkage.reasons.push("Citation node is missing a source ID.");
    result.warnings.push("Missing source.");
  }

  let source = sourceId ? workSources.find(s => s.id === sourceId) : undefined;
  
  if (sourceId && !source) {
    result.linkage.status = 'broken';
    result.linkage.reasons.push("The source referenced by this citation is not in the work's source library.");
    result.warnings.push("Source not found in library.");
  } else if (source) {
    result.linkage.status = 'valid';
  }

  if (source) {
    // 2. Source Identity
    const integrityMeta = source.metadata?.integrity as any;
    if (integrityMeta?.identity?.status) {
      result.sourceIdentity.status = integrityMeta.identity.status;
      if (result.sourceIdentity.status === 'conflict') {
        result.warnings.push("Source identity conflict.");
      }
    } else {
      result.sourceIdentity.status = 'unverified';
    }

    // 3. Evidence Availability
    if (integrityMeta?.evidence_availability) {
      result.evidenceAvailability.status = integrityMeta.evidence_availability;
    } else {
      // Deterministically infer if no H1 metadata exists
      if ((source.metadata?.open_access as any)?.is_oa && (source.metadata?.open_access as any)?.oa_url) {
        result.evidenceAvailability.status = 'full_text_available';
      } else if (source.abstract) {
        result.evidenceAvailability.status = 'abstract_available';
      } else {
        result.evidenceAvailability.status = 'metadata_only';
      }
    }

    // Retraction Warning
    if (integrityMeta?.retraction === 'retracted' || source.metadata?.is_retracted === true) {
      result.warnings.push("Source is retracted.");
    }

    // 4. Bibliography
    try {
      const bibText = formatBibliographyEntry(source, style, undefined);
      if (bibText) {
        result.bibliography.status = 'valid';
      } else {
        result.bibliography.status = 'warning';
        result.bibliography.reasons.push("Bibliography formatter returned empty output.");
      }
    } catch (e: any) {
      result.bibliography.status = 'warning';
      result.bibliography.reasons.push(`Formatting error: ${e.message}`);
    }
  }

  // Calculate Overall
  let isCritical = false;
  let isNeedsReview = false;

  if (
    result.linkage.status !== 'valid' ||
    result.warnings.includes("Source is retracted.") ||
    result.warnings.includes("Source identity conflict.") ||
    result.bibliography.status === 'missing'
  ) {
    isCritical = true;
  }

  if (
    !isCritical &&
    (result.sourceIdentity.status === 'partial' ||
     result.sourceIdentity.status === 'unverified' ||
     result.bibliography.status === 'warning' ||
     result.evidenceAvailability.status === 'metadata_only')
  ) {
    isNeedsReview = true;
  }

  if (isCritical) {
    result.overall = 'critical';
  } else if (isNeedsReview) {
    result.overall = 'needs_review';
  } else {
    result.overall = 'healthy';
  }

  return result;
}
