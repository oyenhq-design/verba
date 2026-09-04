import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

function canonicalStringify(obj: unknown): string {
  if (Array.isArray(obj)) return `[${obj.map(canonicalStringify).join(',')}]`;
  if (typeof obj === 'object' && obj !== null) {
    return `{${Object.keys(obj).sort().map(k => `"${k}":${canonicalStringify((obj as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(obj);
}

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string, versionId: string } }
) {
  const supabase = createClient();

  try {
    const { expectedEditorVersion } = await request.json();

    if (!params.id || !params.versionId) {
      return NextResponse.json({ error: 'Missing document id or version id' }, { status: 400 });
    }
    if (typeof expectedEditorVersion !== 'number') {
      return NextResponse.json({ error: 'Missing or invalid expectedEditorVersion' }, { status: 400 });
    }

    // 1. Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Compute canonical hash for the current document state
    const { data: currentDoc, error: docError } = await supabase
      .from('documents')
      .select('editor_state, word_count')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (docError || !currentDoc) {
      return NextResponse.json({ error: 'Document not found or unauthorized' }, { status: 404 });
    }

    const currentHash = createHash('sha256').update(canonicalStringify(currentDoc.editor_state)).digest('hex');

    // 3. Execute the atomic restore RPC
    const { data: newVersion, error: rpcError } = await supabase.rpc('restore_document_version', {
      p_document_id: params.id,
      p_version_id: params.versionId,
      p_expected_version: expectedEditorVersion,
      p_safety_hash: currentHash
    });

    if (rpcError) {
      console.error('[restore] RPC Error:', rpcError);
      // Map PostgREST custom error codes
      if (rpcError.code === 'P0001' || rpcError.code === 'P0003') {
        return NextResponse.json({ error: 'Document or Version not found' }, { status: 404 });
      }
      if (rpcError.code === 'P0002') {
        return NextResponse.json({ error: 'Stale write conflict' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to restore document version' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      newVersion
    });

  } catch (error: unknown) {
    console.error('[restore] Unexpected error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
