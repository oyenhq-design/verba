import { NormalizedSource } from '../sources/types';

// ─── Evidence Levels ──────────────────────────────────────────────────────────
// Ordered from weakest to strongest evidence
export type EvidenceLevel = 0 | 1 | 2 | 3;

export const EVIDENCE_LEVEL_LABELS: Record<EvidenceLevel, string> = {
  0: 'Metadata only',
  1: 'Abstract',
  2: 'Open access full text',
  3: 'User-provided document',
};

// Human-facing explanation of what can be inferred at each level
export const EVIDENCE_LEVEL_CAPABILITY: Record<EvidenceLevel, string> = {
  0: 'Source identity and bibliography can be evaluated. Claim support cannot be determined from metadata alone.',
  1: 'Claims clearly represented in the abstract may be checked. Absence from abstract does not confirm the full paper lacks support.',
  2: 'Full text allows stronger claim analysis including sections, figures, and numerical data.',
  3: 'User-supplied document allows complete claim analysis.',
};

export type EvidencePassage = {
  text: string;
  /** Section heading if known (e.g., "Abstract", "Introduction", "Results") */
  section: string | null;
  page?: number | null;
  /** URL to lawful source location (open access only) */
  sourceUrl?: string | null;
};

export type EvidenceAvailabilityResult = {
  /** 0 = metadata only, 1 = abstract, 2 = OA full text, 3 = user doc */
  level: EvidenceLevel;
  label: string;
  capability: string;
  abstract: string | null;
  /** Lawful OA URL (PDF or landing page) if available */
  oaUrl: string | null;
  /** Whether full text was actually fetched and available for analysis */
  fullTextAvailable: boolean;
};

/**
 * Determines the evidence level available for a source.
 * Does NOT fetch full text — that is done separately in the claim support pipeline.
 * 
 * Rules:
 * - Level 0: Only bibliographic metadata (no abstract, no OA URL)
 * - Level 1: Abstract available
 * - Level 2: Lawful OA full text URL available (is_oa = true, oa_url set)
 * - Level 3: User-provided document (not managed here; caller must signal this)
 */
export function classifyEvidenceAvailability(
  source: NormalizedSource,
  userProvidedDoc?: boolean
): EvidenceAvailabilityResult {
  // Level 3: User-provided document
  if (userProvidedDoc) {
    return {
      level: 3,
      label: EVIDENCE_LEVEL_LABELS[3],
      capability: EVIDENCE_LEVEL_CAPABILITY[3],
      abstract: source.abstract || null,
      oaUrl: null,
      fullTextAvailable: true,
    };
  }

  // Level 2: Lawful OA full text URL available
  const oa = source.metadata?.open_access as any;
  let oaUrl: string | null = null;

  if (oa?.is_oa && oa?.oa_url) {
    try {
      const u = new URL(oa.oa_url);
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        oaUrl = oa.oa_url;
      }
    } catch (_) {
      // invalid URL — ignore
    }
  }

  if (oaUrl) {
    return {
      level: 2,
      label: EVIDENCE_LEVEL_LABELS[2],
      capability: EVIDENCE_LEVEL_CAPABILITY[2],
      abstract: source.abstract || null,
      oaUrl,
      fullTextAvailable: false, // URL available but text not yet fetched
    };
  }

  // Level 1: Abstract available
  if (source.abstract && source.abstract.trim().length > 20) {
    return {
      level: 1,
      label: EVIDENCE_LEVEL_LABELS[1],
      capability: EVIDENCE_LEVEL_CAPABILITY[1],
      abstract: source.abstract,
      oaUrl: null,
      fullTextAvailable: false,
    };
  }

  // Level 0: Metadata only
  return {
    level: 0,
    label: EVIDENCE_LEVEL_LABELS[0],
    capability: EVIDENCE_LEVEL_CAPABILITY[0],
    abstract: null,
    oaUrl: null,
    fullTextAvailable: false,
  };
}
