/**
 * scope.ts — Claim Scope Extraction
 *
 * Extracts the meaningful claim context around a citation node from
 * the surrounding paragraph text provided by the DOM/editor.
 *
 * H2E update: added paragraphText (full cleaned paragraph) and
 * candidateClaimText (paragraph with citation artefacts stripped),
 * used for recovery fingerprinting and UI display.
 */

export type ClaimScope = {
  citationId: string;
  sourceId: string | null;
  /**
   * Primary claim sentence (first sentence of the paragraph,
   * after stripping citation artefacts).
   */
  sentence: string;
  /**
   * Full cleaned paragraph context (up to 600 chars), with
   * citation artefact text stripped. Used for UI display.
   */
  paragraphContext: string;
  /**
   * Full paragraph with citation rendering artefacts removed.
   * Used for recovery fingerprinting and query generation.
   * May be up to ~800 chars.
   */
  candidateClaimText: string;
  /** Atomic claims extracted from the sentence (if multi-clause). */
  atomicClaims: string[];
  /** 
   * Decomposed claims for the entire selection if it spans multiple assertions.
   * Defaults to [] to preserve backwards compatibility.
   */
  passageClaims?: string[];
  /** Deterministic SHA/fingerprint hash of normalized claim text + citationId + sourceId. */
  claimHash: string;
};

// ─── Citation Artefact Stripping ──────────────────────────────────────────────

/**
 * Strips inline citation rendering artefacts from paragraph text.
 *
 * Handles:
 *   APA:   (Author, 2020)  (Author et al., 2020)  (Author & Other, 2020)
 *   IEEE:  [1]  [1, 2]  [12]
 *   Generic: (Baladi, 2017) (Smith et al., 2019; Jones, 2020)
 */
function stripCitationArtefacts(text: string): string {
  // APA-style: (Anything, 4-digit-year) or (Anything; Anything, year)
  let cleaned = text.replace(/\([^()]{1,120},\s*\d{4}[a-z]?(;\s*[^();]{1,80},\s*\d{4}[a-z]?)*\)/g, '');
  // IEEE-style: [1] or [1, 2] or [12]
  cleaned = cleaned.replace(/\[\d+(?:,\s*\d+)*\]/g, '');
  // Collapse extra whitespace
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  return cleaned;
}

// ─── Hash ─────────────────────────────────────────────────────────────────────

/**
 * Simple deterministic string hash for claim text fingerprinting.
 */
export function generateClaimHash(
  claimText: string,
  citationId: string,
  sourceId: string | null
): string {
  const str = `${citationId}:${sourceId || 'none'}:${claimText.trim().toLowerCase().replace(/\s+/g, ' ')}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `hash_${Math.abs(hash).toString(36)}`;
}

// ─── Extractor ────────────────────────────────────────────────────────────────

/**
 * Extracts sentence context, full paragraph, and atomic propositions
 * around a citation node.
 *
 * @param citationId  The citation node's ID attribute.
 * @param sourceId    The source ID the citation points to.
 * @param fullText    The raw text content of the surrounding paragraph
 *                    (from DOM parentElement.textContent or editor state).
 *                    May contain rendered citation artefacts like "(Author, 2020)".
 */
export function extractClaimScope(
  citationId: string,
  sourceId: string | null,
  fullText: string
): ClaimScope {
  if (!fullText || !fullText.trim()) {
    return {
      citationId,
      sourceId,
      sentence: '',
      paragraphContext: '',
      candidateClaimText: '',
      atomicClaims: [],
      passageClaims: [],
      claimHash: generateClaimHash('', citationId, sourceId),
    };
  }

  // Strip citation artefacts for recovery and display purposes
  const cleaned = stripCitationArtefacts(fullText.trim());

  // candidateClaimText = full cleaned paragraph (for fingerprinting/query generation)
  const candidateClaimText = cleaned.slice(0, 800);

  // paragraphContext = cleaned paragraph, clipped for display (600 chars)
  const paragraphContext = cleaned.slice(0, 600);

  // Primary sentence: first sentence of cleaned text
  // Split on sentence-ending punctuation followed by whitespace
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  const primarySentence = sentences.length > 0 ? sentences[0] : cleaned;

  // Extract atomic claims if sentence has multi-clause items
  // We only split on semicolons now to avoid producing broken fragments.
  const atomicClaims: string[] = [];
  const parts = primarySentence
    .split(/[;]/)
    .map(p => p.trim())
    .filter(p => p.length > 10);

  if (parts.length > 1) {
    atomicClaims.push(...parts);
  } else {
    atomicClaims.push(primarySentence);
  }

  // Hash over the full candidateClaimText for better stale detection
  const claimHash = generateClaimHash(candidateClaimText, citationId, sourceId);

  return {
    citationId,
    sourceId,
    sentence: primarySentence,
    paragraphContext,
    candidateClaimText,
    atomicClaims,
    passageClaims: extractPassageClaims(fullText),
    claimHash,
  };
}

/**
 * Deterministically extracts a list of meaningful distinct claims from a larger passage.
 * Used for detecting Passage Mode in Research.
 */
export function extractPassageClaims(text: string): string[] {
  if (!text || !text.trim()) return [];
  
  const cleaned = stripCitationArtefacts(text.trim());
  const sentences = cleaned.split(/(?<=[.!?])\s+|\n+/).filter(s => s.trim().length > 0);
  
  const allClaims: string[] = [];
  
  for (const sentence of sentences) {
    // Filter out very short fragments or things that look like headings (no punctuation)
    if (sentence.length < 15) continue;
    
    // Split conservatively only on semicolons to avoid fragments
    const parts = sentence.split(/[;]/).map(p => p.trim()).filter(p => p.length >= 15);
    allClaims.push(...parts);
  }

  // Deduplicate using simple lowercase containment check
  const distinctClaims: string[] = [];
  for (const claim of allClaims) {
    const normalized = claim.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isDup = distinctClaims.some(existing => {
      const existNorm = existing.toLowerCase().replace(/[^a-z0-9]/g, '');
      // If one is substantially a substring of the other, treat as duplicate
      return existNorm.includes(normalized) || normalized.includes(existNorm);
    });
    
    if (!isDup && distinctClaims.length < 8) {
      // Small cleanup for readability (trim trailing punctuation like periods if they were captured oddly, though sentence splitting handles most)
      distinctClaims.push(claim);
    }
  }

  return distinctClaims;
}
