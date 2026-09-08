export type ClaimScope = {
  citationId: string;
  sourceId: string | null;
  /** Sentence or immediate text fragment containing the citation node. */
  sentence: string;
  /** Surrounding paragraph context (max 300 chars). */
  paragraphContext: string;
  /** Atomic claims extracted from the sentence (if multi-clause). */
  atomicClaims: string[];
  /** Deterministic SHA/fingerprint hash of normalized claim text + citationId + sourceId. */
  claimHash: string;
};

/**
 * Simple deterministic string hash for claim text fingerprinting.
 */
export function generateClaimHash(claimText: string, citationId: string, sourceId: string | null): string {
  const str = `${citationId}:${sourceId || 'none'}:${claimText.trim().toLowerCase().replace(/\s+/g, ' ')}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `hash_${Math.abs(hash).toString(36)}`;
}

/**
 * Extracts sentence context and atomic propositions around a citation node.
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
      atomicClaims: [],
      claimHash: generateClaimHash('', citationId, sourceId),
    };
  }

  const cleaned = fullText.trim();
  // Find sentence containing citation or split by period/exclamation/question mark
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  
  // Use full block or primary sentence
  const primarySentence = sentences.length > 0 ? sentences[0] : cleaned;
  
  // Extract atomic claims if sentence has multi-clause items (e.g., lists with commas, and, or semicolon)
  const atomicClaims: string[] = [];
  const parts = primarySentence.split(/[,;]|\band\b|\bwhile\b|\bwhereas\b/i).map(p => p.trim()).filter(p => p.length > 10);

  if (parts.length > 1) {
    atomicClaims.push(...parts);
  } else {
    atomicClaims.push(primarySentence);
  }

  const claimHash = generateClaimHash(primarySentence, citationId, sourceId);

  return {
    citationId,
    sourceId,
    sentence: primarySentence,
    paragraphContext: cleaned.slice(0, 300),
    atomicClaims,
    claimHash,
  };
}
