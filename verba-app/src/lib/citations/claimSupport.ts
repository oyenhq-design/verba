import { NormalizedSource } from '../sources/types';
import { EvidenceAvailabilityResult, EvidencePassage } from './evidence';
import { ClaimScope } from './scope';

// ─── Claim Support Statuses ───────────────────────────────────────────────────

export type ClaimSupportStatus =
  | 'not_checked'
  | 'insufficient_evidence'
  | 'supported'
  | 'partially_supported'
  | 'unclear'
  | 'possibly_contradicted';

export type TopicRelevanceStatus =
  | 'high'
  | 'medium'
  | 'low'
  | 'unrelated'
  | 'unknown';

export type ClaimType =
  | 'general_factual'
  | 'numerical_statistical'
  | 'causal'
  | 'comparative'
  | 'temporal_current_state'
  | 'attribution'
  | 'methodological'
  | 'quotation'
  | 'multi_part';

// ─── Result Types ─────────────────────────────────────────────────────────────

export type TopicRelevanceResult = {
  status: TopicRelevanceStatus;
  /** User-facing short explanation. */
  reason: string;
  /** Whether to surface this as a "Worth checking" warning. */
  flagged: boolean;
};

export type ClaimSupportResult = {
  status: ClaimSupportStatus;
  /**
   * H2 user-facing UX tier: 'good' | 'warning' | 'problem'
   * Maps to "Looks good" / "Worth checking" / "Problem found"
   */
  uxTier: 'good' | 'warning' | 'problem' | 'unavailable';
  /** Short user-facing message (shown in exception list). */
  shortMessage: string;
  /** Extended user-facing explanation (shown in review panel). */
  detailMessage: string;
  /** Atomic claim parts that appear supported. */
  supportedParts: string[];
  /** Atomic claim parts not established from available evidence. */
  unresolvedParts: string[];
  /** Evidence passages used for the assessment. */
  evidencePassages: EvidencePassage[];
  /** If stale: the previous claim hash this result was computed for. */
  computedForHash: string;
  claimType: ClaimType | null;
  /**
   * Whether temporal mismatch was detected (present-tense claim vs old source).
   */
  temporalWarning: string | null;
};

// ─── Claim Type Classification (deterministic) ────────────────────────────────

const TEMPORAL_PRESENT_PATTERNS = /\b(currently|today|now|at present|as of \d{4}|recently|modern|latest|new)\b/i;
const NUMERICAL_PATTERNS = /\b\d+([.,]\d+)?\s*(%|percent|million|billion|thousand|km|years?|days?|months?|participants?|centres?|centers?|schools?|countries?|studies?)/i;
const CAUSAL_PATTERNS = /\b(causes?|leads? to|results? in|contributes? to|produces?|impacts?|affects?)\b/i;
const COMPARATIVE_PATTERNS = /\b(more|less|greater|lower|higher|better|worse|compared to|relative to|significantly)\b/i;
const ATTRIBUTION_PATTERNS = /\b(found|argued|stated|showed|reported|concluded|suggested|proposed|demonstrated)\b/i;
const METHODOLOGICAL_PATTERNS = /\b(method|approach|design|framework|model|analysis|study|experiment|survey|interview|questionnaire)\b/i;
const QUOTATION_PATTERNS = /^["'"]/;

export function classifyClaimType(sentence: string): ClaimType {
  if (QUOTATION_PATTERNS.test(sentence.trim())) return 'quotation';
  if (METHODOLOGICAL_PATTERNS.test(sentence)) return 'methodological';
  if (ATTRIBUTION_PATTERNS.test(sentence)) return 'attribution';
  if (CAUSAL_PATTERNS.test(sentence)) return 'causal';
  if (NUMERICAL_PATTERNS.test(sentence)) return 'numerical_statistical';
  if (TEMPORAL_PRESENT_PATTERNS.test(sentence)) return 'temporal_current_state';
  if (COMPARATIVE_PATTERNS.test(sentence)) return 'comparative';
  return 'general_factual';
}

// ─── Topic Relevance (H2 Claim Relevance ≠ H1 Search Relevance) ──────────────

/**
 * Evaluates topic relevance of a source against a specific claim/sentence.
 * Completely separate from H1 search-level relevance.
 */
export function evaluateTopicRelevance(
  source: NormalizedSource,
  claimScope: ClaimScope,
  projectContext?: Record<string, unknown>
): TopicRelevanceResult {
  const claimText = claimScope.sentence.toLowerCase().replace(/[^\w\s]/g, '');
  const claimTokens = claimText.split(/\s+/).filter(t => t.length > 3);

  let projectTokens: string[] = [];
  if (projectContext) {
    const pText = [
      projectContext.topic,
      projectContext.focus,
      projectContext.methodology,
      ...(Array.isArray(projectContext.objectives) ? projectContext.objectives : [])
    ].filter(Boolean).join(' ').toLowerCase().replace(/[^\w\s]/g, '');
    projectTokens = pText.split(/\s+/).filter(t => t.length > 3);
  }

  if (claimTokens.length === 0 && projectTokens.length === 0) {
    return { status: 'unknown', reason: 'Not enough text to assess relevance.', flagged: false };
  }

  let score = 0;
  const matchedTerms: string[] = [];
  const searchTokens = Array.from(new Set([...claimTokens, ...projectTokens]));

  // Check source title
  const titleTokens = (source.title || '').toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  for (const token of searchTokens) {
    if (titleTokens.some(t => t.includes(token) || token.includes(t))) {
      score += 3;
      matchedTerms.push(token);
    }
  }

  // Check abstract
  if (source.abstract) {
    const abstractTokens = source.abstract.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    for (const token of searchTokens) {
      if (!matchedTerms.includes(token) && abstractTokens.some(a => a.includes(token) || token.includes(a))) {
        score += 2;
        matchedTerms.push(token);
      }
    }
  }

  // Check topics/concepts from OpenAlex metadata
  const topics = source.metadata?.topics as string[] | undefined;
  if (topics && topics.length > 0) {
    for (const token of searchTokens) {
      if (!matchedTerms.includes(token) && topics.some(t => t.toLowerCase().includes(token))) {
        score += 2;
        matchedTerms.push(token);
      }
    }
  }

  // Determine relevance status — require at least 2 meaningful matched terms to reach 'medium' or higher
  // to avoid single common words (e.g. country name) creating false medium relevance
  const relevanceRatio = claimTokens.length > 0 ? matchedTerms.length / claimTokens.length : 0;
  const matchCount = matchedTerms.length;

  let status: TopicRelevanceStatus;
  let reason: string;
  let flagged = false;

  if (matchCount >= 3 && relevanceRatio >= 0.4) {
    status = 'high';
    reason = `This source appears closely related to the topic of the cited statement (matched: ${matchedTerms.slice(0, 3).join(', ')}).`;
  } else if (matchCount >= 2 && relevanceRatio >= 0.2) {
    status = 'medium';
    reason = `This source has some relevance to the cited statement, but the match is partial.`;
  } else if (matchCount === 1) {
    status = 'low';
    reason = `This source has limited topical overlap with the cited statement.`;
    flagged = true;
  } else {
    status = 'unrelated';
    reason = `This source does not appear topically related to the cited statement.`;
    flagged = true;
  }

  return { status, reason, flagged };
}

// ─── Temporal Mismatch Detection ─────────────────────────────────────────────

export function detectTemporalMismatch(
  claimScope: ClaimScope,
  source: NormalizedSource,
  currentYear: number = new Date().getFullYear()
): string | null {
  const hasPresentLanguage = TEMPORAL_PRESENT_PATTERNS.test(claimScope.sentence);
  if (!hasPresentLanguage) return null;

  const sourceYear = source.publication_year;
  if (!sourceYear) return null;

  const age = currentYear - sourceYear;
  if (age >= 10) {
    return `This statement uses present-tense language ("currently", "now", or similar), but the cited source was published ${sourceYear} — ${age} years ago. Verify this still reflects current conditions.`;
  }
  if (age >= 5) {
    return `This statement describes present conditions, but the cited source is from ${sourceYear}. Consider checking whether this is still current.`;
  }
  return null;
}

// ─── Numerical Anchor Check ───────────────────────────────────────────────────

function extractNumberAnchors(text: string): string[] {
  const matches = text.match(/\b\d[\d,.]*([\s-]*(percent|%|million|billion|thousand))?/gi);
  return matches ? Array.from(new Set(matches.map(m => m.trim()))) : [];
}

export function checkNumericalAnchors(
  claimScope: ClaimScope,
  evidenceText: string | null
): { missingAnchors: string[]; foundAnchors: string[] } {
  const claimAnchors = extractNumberAnchors(claimScope.sentence);
  if (claimAnchors.length === 0 || !evidenceText) {
    return { missingAnchors: [], foundAnchors: [] };
  }

  const missing: string[] = [];
  const found: string[] = [];

  for (const anchor of claimAnchors) {
    if (evidenceText.includes(anchor)) {
      found.push(anchor);
    } else {
      // Try normalized form (remove commas, spaces)
      const normalized = anchor.replace(/[,\s]/g, '');
      if (evidenceText.replace(/[,\s]/g, '').includes(normalized)) {
        found.push(anchor);
      } else {
        missing.push(anchor);
      }
    }
  }

  return { missingAnchors: missing, foundAnchors: found };
}

// ─── Deterministic Claim Support Evaluator ────────────────────────────────────

/**
 * Evaluates claim support deterministically from available evidence.
 * This is the H2C engine — it does NOT call any AI/LLM.
 * 
 * AI-based semantic analysis may be layered on top of this in H2E.
 * If no evidence is available, returns 'insufficient_evidence'.
 * 
 * Rules:
 * - Level 0 (metadata only): ALWAYS insufficient_evidence
 * - Level 1/2 (abstract/full text): deterministic checks for numerical mismatch,
 *   temporal warning, and basic token overlap
 */
export function evaluateClaimSupportDeterministic(
  claimScope: ClaimScope,
  evidenceAvailability: EvidenceAvailabilityResult,
  source: NormalizedSource
): ClaimSupportResult {
  const claimType = classifyClaimType(claimScope.sentence);
  const temporalWarning = detectTemporalMismatch(claimScope, source);
  const passages: EvidencePassage[] = [];

  // ── Level 0: Metadata only — always insufficient_evidence ──────────────────
  if (evidenceAvailability.level === 0) {
    return {
      status: 'insufficient_evidence',
      uxTier: 'warning',
      shortMessage: 'Not enough evidence to check',
      detailMessage:
        'Verba found the publication details, but not enough source content to check this claim. Only bibliographic metadata is available.',
      supportedParts: [],
      unresolvedParts: claimScope.atomicClaims,
      evidencePassages: [],
      computedForHash: claimScope.claimHash,
      claimType,
      temporalWarning,
    };
  }

  const evidenceText = evidenceAvailability.abstract;
  const evidenceSection = evidenceAvailability.level === 1 ? 'Abstract' : 'Available text';

  // Attach the abstract as an evidence passage
  if (evidenceText) {
    passages.push({
      text: evidenceText.slice(0, 500) + (evidenceText.length > 500 ? '...' : ''),
      section: evidenceSection,
      sourceUrl: evidenceAvailability.oaUrl,
    });
  }

  // ── Numerical claim check ──────────────────────────────────────────────────
  if (claimType === 'numerical_statistical' && evidenceText) {
    const { missingAnchors, foundAnchors } = checkNumericalAnchors(claimScope, evidenceText);
    if (missingAnchors.length > 0 && foundAnchors.length === 0) {
      const levelLabel = evidenceAvailability.level === 1 ? 'abstract' : 'available text';
      return {
        status: 'unclear',
        uxTier: 'warning',
        shortMessage: 'Specific figure not found in available source',
        detailMessage: `The source discusses a related topic, but the figure(s) "${missingAnchors.join(', ')}" ${missingAnchors.length === 1 ? 'was' : 'were'} not found in the ${levelLabel} available to Verba. This does not mean the full paper lacks this information.`,
        supportedParts: [],
        unresolvedParts: claimScope.atomicClaims,
        evidencePassages: passages,
        computedForHash: claimScope.claimHash,
        claimType,
        temporalWarning,
      };
    } else if (missingAnchors.length > 0 && foundAnchors.length > 0) {
      return {
        status: 'partially_supported',
        uxTier: 'warning',
        shortMessage: 'Only some figures found in available source',
        detailMessage: `The figure(s) "${foundAnchors.join(', ')}" were found in the available source text, but "${missingAnchors.join(', ')}" could not be confirmed.`,
        supportedParts: foundAnchors.map(a => `Contains figure: ${a}`),
        unresolvedParts: missingAnchors.map(a => `Figure not found in available text: ${a}`),
        evidencePassages: passages,
        computedForHash: claimScope.claimHash,
        claimType,
        temporalWarning,
      };
    }
  }

  // ── Contradiction heuristic ────────────────────────────────────────────────
  // Very conservative: only flag if abstract contains explicit negation of a key claim term
  if (evidenceText) {
    const negationPatterns = [
      /no statistically significant/i,
      /did not (significantly|observ|find|show)/i,
      /not associated with/i,
      /no significant (improvement|effect|difference|association)/i,
      /failed to (demonstrate|show|find|establish)/i,
    ];
    const negationFound = negationPatterns.some(p => p.test(evidenceText));

    // Only flag contradiction if key terms from the claim appear in the abstract AND negation is present
    const claimTokens = claimScope.sentence.toLowerCase().split(/\s+/).filter(t => t.length > 4);
    const abstractLower = evidenceText.toLowerCase();
    const hasTopicOverlap = claimTokens.some(t => abstractLower.includes(t));

    if (negationFound && hasTopicOverlap) {
      return {
        status: 'possibly_contradicted',
        uxTier: 'problem',
        shortMessage: 'Available evidence may conflict with this statement',
        detailMessage:
          'The available source text appears to report a different or opposing finding to the claim made here. Review the source carefully before keeping this citation.',
        supportedParts: [],
        unresolvedParts: claimScope.atomicClaims,
        evidencePassages: passages,
        computedForHash: claimScope.claimHash,
        claimType,
        temporalWarning,
      };
    }
  }

  // ── Multi-clause partial support check ────────────────────────────────────
  if (claimScope.atomicClaims.length > 1 && evidenceText) {
    const supported: string[] = [];
    const unresolved: string[] = [];
    for (const claim of claimScope.atomicClaims) {
      const claimWords = claim.toLowerCase().split(/\s+/).filter(t => t.length > 4);
      const matches = claimWords.filter(w => evidenceText.toLowerCase().includes(w));
      if (matches.length >= Math.ceil(claimWords.length * 0.4)) {
        supported.push(claim);
      } else {
        unresolved.push(claim);
      }
    }
    if (unresolved.length > 0 && supported.length > 0) {
      return {
        status: 'partially_supported',
        uxTier: 'warning',
        shortMessage: 'Source appears to support only part of this statement',
        detailMessage:
          'The available source evidence corresponds to some but not all parts of this statement. Review what is and is not established from the source.',
        supportedParts: supported,
        unresolvedParts: unresolved,
        evidencePassages: passages,
        computedForHash: claimScope.claimHash,
        claimType,
        temporalWarning,
      };
    }
  }

  // ── Default: unclear (cannot determine from available evidence) ───────────
  return {
    status: 'unclear',
    uxTier: 'warning',
    shortMessage: 'Could not confirm claim from available source',
    detailMessage:
      evidenceAvailability.level === 1
        ? "Verba couldn't confirm this claim from the abstract available to it. This does not mean the full paper doesn't support the claim."
        : "Verba couldn't confirm this specific claim from the available source text.",
    supportedParts: [],
    unresolvedParts: claimScope.atomicClaims,
    evidencePassages: passages,
    computedForHash: claimScope.claimHash,
    claimType,
    temporalWarning,
  };
}
