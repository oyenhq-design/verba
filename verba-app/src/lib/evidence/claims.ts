import { SupabaseClient } from '@supabase/supabase-js';
import { normalizeClaimText } from './normalize';
import { generateClaimHash } from '../citations/scope';

export type UpsertClaimParams = {
  workId: string;
  documentId: string;
  userId: string;
  blockId: string;
  claimText: string;
  claimType?: string;
  startOffset?: number;
  endOffset?: number;
};

export async function upsertClaim(supabase: SupabaseClient, params: UpsertClaimParams) {
  const { workId, documentId, userId, blockId, claimText, claimType = 'other', startOffset, endOffset } = params;
  
  const normalizedText = normalizeClaimText(claimText);
  // Hash includes the text, and block ID context instead of citationId here since it's unmapped initially
  const contentHash = generateClaimHash(normalizedText, blockId, null);

  // Check if exactly same claim exists
  const { data: existing, error: existError } = await supabase
    .from('claims')
    .select('id, status')
    .eq('document_id', documentId)
    .eq('block_id', blockId)
    .eq('content_hash', contentHash)
    .maybeSingle();
    
  if (existError) throw existError;
  if (existing) {
    if (existing.status !== 'current') {
      await supabase.from('claims').update({ status: 'current' }).eq('id', existing.id);
    }
    return existing.id;
  }
  
  // Stale previously overlapping claims in same block if bounds overlap or if we treat the block linearly
  // We'll mark exactly overlapping claims as stale if they have the same start/end, but keeping it conservative.
  if (startOffset !== undefined && endOffset !== undefined) {
    await supabase.from('claims')
      .update({ status: 'stale' })
      .eq('document_id', documentId)
      .eq('block_id', blockId)
      .not('status', 'eq', 'stale')
      .eq('start_offset', startOffset)
      .eq('end_offset', endOffset);
  }

  // Insert new claim
  const { data: newClaim, error: insertError } = await supabase
    .from('claims')
    .insert({
      work_id: workId,
      document_id: documentId,
      user_id: userId,
      block_id: blockId,
      claim_text: claimText,
      normalized_claim_text: normalizedText,
      content_hash: contentHash,
      claim_type: claimType,
      start_offset: startOffset ?? null,
      end_offset: endOffset ?? null,
      status: 'current'
    })
    .select('id')
    .single();
    
  if (insertError) throw insertError;
  return newClaim.id;
}
