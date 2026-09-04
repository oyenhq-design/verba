import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

function canonicalStringify(obj: any): string {
  if (Array.isArray(obj)) return `[${obj.map(canonicalStringify).join(',')}]`;
  if (typeof obj === 'object' && obj !== null) {
    return `{${Object.keys(obj).sort().map(k => `"${k}":${canonicalStringify(obj[k])}`).join(',')}}`;
  }
  return JSON.stringify(obj);
}

export const dynamic = 'force-dynamic';

/**
 * POST /api/documents/[id]/save
 *
 * Persists the current Tiptap editor JSON state for a document.
 * Increments editor_version to protect against stale writes.
 * Only updates if the incoming version matches the current DB version
 * (i.e. this save represents newer content than any concurrent save).
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  try {
    const { editorState, wordCount, expectedVersion, saveType = 'autosave' } = await request.json();

    if (!params.id) {
      return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
    }
    if (!editorState || typeof editorState !== 'object') {
      return NextResponse.json({ error: 'Invalid editorState payload' }, { status: 400 });
    }

    // 1. Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify ownership — fetch document scoped by id AND user_id
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .select('id, user_id, editor_version')
      .eq('id', params.id)
      .eq('user_id', user.id)   // ownership check — not trusted from browser
      .single();

    if (docError || !docData) {
      return NextResponse.json({ error: 'Document not found or unauthorized' }, { status: 404 });
    }

    // 3. Stale-write protection
    // If the client's expectedVersion is defined, reject writes that are behind
    // the current DB version. This prevents an older queued save from
    // overwriting a newer one that already succeeded.
    if (typeof expectedVersion === 'number' && docData.editor_version > expectedVersion) {
      // A newer save already succeeded — this request is stale. Return the
      // current version so the client can update its baseline.
      return NextResponse.json({
        success: false,
        stale: true,
        currentVersion: docData.editor_version,
      }, { status: 409 });
    }

    // 4. Persist
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        editor_state: editorState,
        editor_updated_at: new Date().toISOString(),
        editor_version: docData.editor_version + 1,
        // Update word_count alongside the save so it always reflects latest content
        ...(typeof wordCount === 'number' && wordCount >= 0 ? { word_count: wordCount } : {}),
      })
      .eq('id', params.id)
      .eq('user_id', user.id);   // double-check ownership in UPDATE predicate

    if (updateError) {
      console.error('[save] Supabase update error:', updateError.message);
      return NextResponse.json({ error: 'Failed to save document' }, { status: 500 });
    }

    const newVersion = docData.editor_version + 1;

    // 5. Checkpoint handling
    if (saveType === 'manual_save' || saveType === 'autosave_checkpoint') {
      try {
        const contentHash = createHash('sha256').update(canonicalStringify(editorState)).digest('hex');
        
        const { data: latestVersion } = await supabase
          .from('document_versions')
          .select('content_hash')
          .eq('document_id', params.id)
          .order('version_number', { ascending: false })
          .limit(1)
          .single();

        if (!latestVersion || latestVersion.content_hash !== contentHash) {
          const { error: versionError } = await supabase
            .from('document_versions')
            .insert({
              document_id: params.id,
              user_id: user.id,
              version_number: newVersion,
              source: saveType,
              editor_state: editorState,
              content_hash: contentHash,
              word_count: typeof wordCount === 'number' ? wordCount : 0
            });
            
          if (versionError) {
            console.error('[save] Failed to create document version checkpoint:', versionError.message);
          }
          
          if (saveType === 'manual_save' && !versionError) {
             const { error: eventError } = await supabase
               .from('document_events')
               .insert({
                 document_id: params.id,
                 user_id: user.id,
                 event_type: 'manual_save'
               });
             if (eventError) console.error('[save] Failed to log manual_save event:', eventError.message);
          }
        }
      } catch (err) {
        console.error('[save] Checkpoint creation error (non-fatal):', err);
      }
    }

    return NextResponse.json({
      success: true,
      newVersion,
    });

  } catch (error: unknown) {
    console.error('[save] Unexpected error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
