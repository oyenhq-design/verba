import { NormalizedSource } from '../sources/types';
import { formatBibliographyEntry, CitationStyle } from './formatter';
import { ClaimScope, extractClaimScope } from './scope';
import { classifyEvidenceAvailability, EvidenceAvailabilityResult, EvidencePassage } from './evidence';
import {
  evaluateTopicRelevance,
  evaluateClaimSupportDeterministic,
  TopicRelevanceStatus,
  ClaimSupportStatus,
  ClaimSupportResult,
  TopicRelevanceResult,
} from './claimSupport';

// ─── Reason Codes ─────────────────────────────────────────────────────────────

export type IntegrityReasonCode =
  | 'source_retracted'
  | 'source_missing'
  | 'citation_link_broken'
  | 'citation_link_missing'
  | 'bibliography_missing'
  | 'identity_conflict'
  | 'bibliography_warning'
  | 'identity_partial'
  | 'identity_unverified'
  | 'metadata_incomplete';

export type IntegrityReason = {
  code: IntegrityReasonCode;
  severity: 'critical' | 'review';
  /** Short message for the collapsed card (fits ~50 chars). */
  shortMessage: string;
  /** Full sentence for expanded detail view. */
  message: string;
};

// Deterministic human-readable copy, keyed by code
const REASON_COPY: Record<
  IntegrityReasonCode,
  { severity: 'critical' | 'review'; shortMessage: string; message: string }
> = {
  source_retracted: {
    severity: 'critical',
    shortMessage: 'Source has a retraction warning.',
    message:
      'This source carries a retraction warning. Citing retracted work may undermine your argument.',
  },
  source_missing: {
    severity: 'critical',
    shortMessage: 'Source not found in library.',
    message:
      "The citation references a source that cannot be found in the current work's source library.",
  },
  citation_link_broken: {
    severity: 'critical',
    shortMessage: 'Citation is not linked to a source.',
    message:
      'The citation node exists in the document but its source reference is broken.',
  },
  citation_link_missing: {
    severity: 'critical',
    shortMessage: 'Citation has no source ID.',
    message: 'This citation node is missing a source identifier entirely.',
  },
  bibliography_missing: {
    severity: 'critical',
    shortMessage: 'Bibliography entry could not be generated.',
    message:
      'A bibliography entry could not be produced for this source. Required metadata may be absent.',
  },
  identity_conflict: {
    severity: 'critical',
    shortMessage: 'Source metadata conflicts across providers.',
    message:
      'Bibliographic metadata for this source does not agree across verification signals. The source identity may be ambiguous.',
  },
  bibliography_warning: {
    severity: 'review',
    shortMessage: 'Bibliography entry may be incomplete.',
    message:
      'The bibliography formatter produced output but some fields may be missing or incorrectly formed.',
  },
  identity_partial: {
    severity: 'review',
    shortMessage: 'Identity partially confirmed.',
    message:
      'Source identity is only partially confirmed. Independent bibliographic provider agreement is not available.',
  },
  identity_unverified: {
    severity: 'review',
    shortMessage: 'Identity not independently verified.',
    message:
      'Source identity has not been independently confirmed by a bibliographic provider.',
  },
  metadata_incomplete: {
    severity: 'review',
    shortMessage: 'Some bibliographic metadata is incomplete.',
    message:
      'One or more bibliographic fields are missing, which may affect citation formatting.',
  },
};

function makeReason(code: IntegrityReasonCode): IntegrityReason {
  return { code, ...REASON_COPY[code] };
}

// ─── Result Type ──────────────────────────────────────────────────────────────

export type CitationIntegrityResult = {
  citationId: string;
  sourceId: string | null;

  linkage: {
    status: 'valid' | 'broken' | 'missing';
    reasons: string[];
  };

  sourceIdentity: {
    status: 'confirmed' | 'partial' | 'conflict' | 'unverified';
    /** Provider names that agree on this source's identity (from H1 metadata). */
    providers: string[];
    reasons: string[];
  };

  bibliography: {
    status: 'valid' | 'warning' | 'missing';
    reasons: string[];
  };

  evidenceAvailability: {
    status:
      | 'not_checked'
      | 'metadata_only'
      | 'abstract_available'
      | 'full_text_location_available';
  };

  claimSupport: {
    status: ClaimSupportStatus;
    uxTier: 'good' | 'warning' | 'problem' | 'unavailable' | 'not_checked';
    shortMessage: string | null;
    detailMessage: string | null;
    supportedParts: string[];
    unresolvedParts: string[];
    evidencePassages: EvidencePassage[];
    temporalWarning: string | null;
    /** claim_hash this result was computed for — used for stale detection */
    computedForHash: string | null;
    /** true if the claim text changed since last evaluation */
    isStale: boolean;
  };

  topicRelevance: {
    status: TopicRelevanceStatus;
    reason: string;
    flagged: boolean;
  };

  /** H2 scope — sentence and atomic claims around the citation node */
  claimScope: ClaimScope | null;

  /** Evidence level and availability result */
  evidenceDetail: EvidenceAvailabilityResult | null;

  warnings: string[];

  overall: 'healthy' | 'needs_review' | 'critical';

  /**
   * The single highest-severity reason driving the overall status.
   * null when overall === 'healthy'.
   */
  primaryReason: IntegrityReason | null;

  /**
   * All reasons in severity-priority order (most severe first).
   * Empty when overall === 'healthy'.
   */
  reasons: IntegrityReason[];
};

// ─── Evaluator ────────────────────────────────────────────────────────────────

export function evaluateCitationIntegrity(
  citationId: string,
  sourceId: string | null,
  workSources: NormalizedSource[],
  style: CitationStyle,
  /** Sentence/paragraph text around the citation node, from DOM or editor state. */
  contextText?: string,
  /** Previously computed claim hash — used to detect stale analysis. */
  previousClaimHash?: string,
  /** Full project context from the work record. */
  projectContext?: Record<string, unknown>
): CitationIntegrityResult {
  const result: CitationIntegrityResult = {
    citationId,
    sourceId,
    linkage: { status: 'valid', reasons: [] },
    sourceIdentity: { status: 'unverified', providers: [], reasons: [] },
    bibliography: { status: 'missing', reasons: [] },
    evidenceAvailability: { status: 'not_checked' },
    claimSupport: {
      status: 'not_checked',
      uxTier: 'not_checked',
      shortMessage: null,
      detailMessage: null,
      supportedParts: [],
      unresolvedParts: [],
      evidencePassages: [],
      temporalWarning: null,
      computedForHash: null,
      isStale: false,
    },
    topicRelevance: { status: 'unknown', reason: '', flagged: false },
    claimScope: null,
    evidenceDetail: null,
    warnings: [],
    overall: 'needs_review',
    primaryReason: null,
    reasons: [],
  };

  const collectedReasons: IntegrityReason[] = [];

  // ── 1. Linkage Check ────────────────────────────────────────────────────────
  if (!sourceId) {
    result.linkage.status = 'missing';
    result.linkage.reasons.push('Citation node is missing a source ID.');
    result.warnings.push('Missing source.');
    collectedReasons.push(makeReason('citation_link_missing'));
  }

  const source = sourceId ? workSources.find(s => s.id === sourceId) : undefined;

  if (sourceId && !source) {
    result.linkage.status = 'broken';
    result.linkage.reasons.push(
      "The source referenced by this citation is not in the work's source library."
    );
    result.warnings.push('Source not found in library.');
    collectedReasons.push(makeReason('source_missing'));
  } else if (source) {
    result.linkage.status = 'valid';
  }

  if (source) {
    const integrityMeta = source.metadata?.integrity as any;

    // ── 2. Source Identity ──────────────────────────────────────────────────
    if (integrityMeta?.identity?.status) {
      result.sourceIdentity.status = integrityMeta.identity.status;
    } else {
      result.sourceIdentity.status = 'unverified';
    }

    // Extract provider agreement from H1 provenance metadata
    if (integrityMeta?.identity?.agreement && Array.isArray(integrityMeta.identity.agreement)) {
      result.sourceIdentity.providers = integrityMeta.identity.agreement;
    }

    // Propagate dimension-level reasons from H1 metadata
    if (integrityMeta?.identity?.reasons && Array.isArray(integrityMeta.identity.reasons)) {
      result.sourceIdentity.reasons = integrityMeta.identity.reasons;
    }

    if (result.sourceIdentity.status === 'conflict') {
      result.warnings.push('Source identity conflict.');
      collectedReasons.push(makeReason('identity_conflict'));
    }

    // ── 3. Evidence Availability ────────────────────────────────────────────
    // Evidence availability is INFORMATIONAL — it does not drive overall status.
    if (integrityMeta?.evidence_availability) {
      result.evidenceAvailability.status = integrityMeta.evidence_availability;
    } else {
      // Deterministically infer from source metadata when no H1 record
      const oa = source.metadata?.open_access as any;
      if (oa?.is_oa && oa?.oa_url) {
        result.evidenceAvailability.status = 'full_text_location_available';
      } else if (source.abstract) {
        result.evidenceAvailability.status = 'abstract_available';
      } else {
        result.evidenceAvailability.status = 'metadata_only';
      }
    }

    // ── 4. Retraction ────────────────────────────────────────────────────────
    const isRetracted =
      integrityMeta?.retraction === 'retracted' ||
      source.metadata?.is_retracted === true;
    if (isRetracted) {
      result.warnings.push('Source is retracted.');
      collectedReasons.push(makeReason('source_retracted'));
    }

    // ── 5. Bibliography ──────────────────────────────────────────────────────
    try {
      const bibText = formatBibliographyEntry(source, style, undefined);
      if (bibText) {
        result.bibliography.status = 'valid';
      } else {
        result.bibliography.status = 'warning';
        result.bibliography.reasons.push('Bibliography formatter returned empty output.');
        collectedReasons.push(makeReason('bibliography_warning'));
      }
    } catch (e: any) {
      result.bibliography.status = 'warning';
      result.bibliography.reasons.push(`Formatting error: ${e.message}`);
      collectedReasons.push(makeReason('bibliography_warning'));
    }
  } else if (!sourceId) {
    // No source — bibliography is implicitly missing (already critical via linkage)
  } else {
    // sourceId set but source not found — bibliography missing
    collectedReasons.push(makeReason('bibliography_missing'));
  }

  // ── H2: Claim Scope, Evidence Level, Topic Relevance, Claim Support ─────────
  if (source && contextText) {
    // H2A: Extract claim scope
    const scope = extractClaimScope(citationId, sourceId, contextText);
    result.claimScope = scope;

    // Stale detection: if claim text changed since last check, mark stale
    if (previousClaimHash && previousClaimHash !== scope.claimHash) {
      result.claimSupport.isStale = true;
    }

    // H2B: Classify evidence availability
    const evidenceDetail = classifyEvidenceAvailability(source);
    result.evidenceDetail = evidenceDetail;
    // Keep legacy evidenceAvailability for H1 compatibility
    result.evidenceAvailability.status =
      evidenceDetail.level === 0
        ? 'metadata_only'
        : evidenceDetail.level === 1
        ? 'abstract_available'
        : 'full_text_location_available';

    // H2A: Topic Relevance (separate from H1 search relevance)
    const relevance = evaluateTopicRelevance(source, scope, projectContext);
    result.topicRelevance = relevance;
    if (relevance.flagged) {
      result.warnings.push('Source may be unrelated to the cited statement.');
    }

    // H2C: Deterministic claim support evaluation
    if (!result.claimSupport.isStale) {
      const supportResult = evaluateClaimSupportDeterministic(scope, evidenceDetail, source);
      result.claimSupport = {
        status: supportResult.status,
        uxTier: supportResult.uxTier,
        shortMessage: supportResult.shortMessage,
        detailMessage: supportResult.detailMessage,
        supportedParts: supportResult.supportedParts,
        unresolvedParts: supportResult.unresolvedParts,
        evidencePassages: supportResult.evidencePassages,
        temporalWarning: supportResult.temporalWarning,
        computedForHash: supportResult.computedForHash,
        isStale: false,
      };

      // Temporal warning should be surfaced as a warning (but not critical)
      if (supportResult.temporalWarning) {
        result.warnings.push(supportResult.temporalWarning);
      }
    }
  } else if (source && !contextText) {
    // Source exists but no context text — classify evidence level for informational display
    const evidenceDetail = classifyEvidenceAvailability(source);
    result.evidenceDetail = evidenceDetail;
    result.evidenceAvailability.status =
      evidenceDetail.level === 0
        ? 'metadata_only'
        : evidenceDetail.level === 1
        ? 'abstract_available'
        : 'full_text_location_available';
  }

  // Source exists but bibliography status is still 'missing' (initial default)
  // only when source was found and formatter threw — handled above.
  // If source exists and bibliography is 'missing' (default), that means it was
  // never evaluated — shouldn't happen; guard anyway.

  // ── 6. Review-level identity reasons (when not already critical) ──────────
  // Only add these if not already a critical identity reason.
  const hasIdentityConflict = collectedReasons.some(r => r.code === 'identity_conflict');
  if (!hasIdentityConflict && source) {
    if (result.sourceIdentity.status === 'partial') {
      collectedReasons.push(makeReason('identity_partial'));
    } else if (result.sourceIdentity.status === 'unverified') {
      collectedReasons.push(makeReason('identity_unverified'));
    }
  }

  // ── 7. Sort reasons by severity (critical first, then review) ─────────────
  // Within same severity, maintain insertion order (priority order).
  const SEVERITY_ORDER: Record<string, number> = { critical: 0, review: 1 };
  collectedReasons.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  result.reasons = collectedReasons;
  result.primaryReason = collectedReasons[0] ?? null;

  // ── 8. Calculate Overall ──────────────────────────────────────────────────
  const hasCritical = collectedReasons.some(r => r.severity === 'critical');
  const hasReview = collectedReasons.some(r => r.severity === 'review');

  // NOTE: claimSupport = 'not_checked' is INFORMATIONAL — does NOT trigger needs_review.
  // NOTE: evidenceAvailability = 'metadata_only' is INFORMATIONAL — does NOT trigger needs_review.
  // Both are preserved as visible dimensions without affecting overall classification.

  if (hasCritical) {
    result.overall = 'critical';
  } else if (hasReview) {
    result.overall = 'needs_review';
  } else {
    result.overall = 'healthy';
    result.primaryReason = null;
    result.reasons = [];
  }

  return result;
}
