import { checkNumericMismatch } from './numeric';

export type RelationshipType = 'supports' | 'partially_supports' | 'related' | 'contradicts' | 'unclear' | 'not_checked';
export type EvidenceLevel = 'metadata_only' | 'abstract_checked' | 'excerpt_checked' | 'full_text_section_checked' | 'full_text_checked';
export type VerificationMethod = 'not_checked' | 'deterministic_guard' | 'manual_review';

export function determineDeterministicRelationship(claimText: string, evidenceText: string | null): { relationship: RelationshipType, method: VerificationMethod } {
  if (!evidenceText) {
    return { relationship: 'not_checked', method: 'not_checked' };
  }

  // Use numeric mismatch guard
  if (checkNumericMismatch(claimText, evidenceText)) {
    return { relationship: 'unclear', method: 'deterministic_guard' };
  }

  // Deterministic overlap cannot yield 'supports'. We can only yield 'related' or 'unclear' at best for now.
  // Real check would require TF-IDF/embeddings or OpenAI.
  // For this milestone:
  const normalizedClaim = claimText.toLowerCase();
  const normalizedEvidence = evidenceText.toLowerCase();
  
  // Basic lexical check
  const claimWords = normalizedClaim.split(/\s+/).filter(w => w.length > 4);
  const matchedWords = claimWords.filter(w => normalizedEvidence.includes(w));
  
  if (claimWords.length > 0 && matchedWords.length / claimWords.length > 0.4) {
    return { relationship: 'related', method: 'deterministic_guard' };
  }
  
  return { relationship: 'unclear', method: 'deterministic_guard' };
}
