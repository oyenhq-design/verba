import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = createClient();
  let documentId: string | null = null;

  try {
    const body = await request.json();
    documentId = body.documentId || null;

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    // 1. Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify ownership — fetch document scoped by BOTH id AND user_id.
    //    A malicious authenticated user who supplies another user's documentId
    //    will get a 404 here because user_id will not match.
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .select('id, user_id, storage_path')
      .eq('id', documentId)
      .eq('user_id', user.id)   // ownership check — never trust user_id from body
      .single();

    if (docError || !docData) {
      return NextResponse.json({ error: 'Document not found or unauthorized' }, { status: 404 });
    }

    // 3. Mark as processing
    await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId)
      .eq('user_id', user.id);

    // 4. Download from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(docData.storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file from storage: ${downloadError?.message}`);
    }

    // 5. Send to Python FastAPI Engine
    const formData = new FormData();
    formData.append('file', fileData, 'document.docx');

    let engineUrl = process.env.VERBA_ENGINE_URL;
    if (!engineUrl) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'ENGINE_CONFIG_MISSING', message: 'VERBA_ENGINE_URL environment variable is missing.' },
          { status: 500 }
        );
      }
      engineUrl = 'http://localhost:8000';
    }

    const engineResponse = await fetch(`${engineUrl}/api/parse`, {
      method: 'POST',
      body: formData,
    });

    if (!engineResponse.ok) {
      const errorText = await engineResponse.text();
      throw new Error(`Python engine error: ${errorText}`);
    }

    const parsedJson = await engineResponse.json();

    // 6. Calculate word count deterministically from parsed blocks
    let wordCount = 0;
    if (parsedJson.sections) {
      parsedJson.sections.forEach((section: { blocks?: { text?: string }[] }) => {
        section.blocks?.forEach((block: { text?: string }) => {
          if (block.text) {
            const words = block.text.trim().split(/\s+/).filter((w: string) => w.length > 0);
            wordCount += words.length;
          }
        });
      });
    }

    // 7. Save parsed content and mark as ready.
    //    Do NOT touch editor_state — the original parsed_content is the
    //    authoritative source until the user first saves an edited version.
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'ready',
        parsed_content: parsedJson,
        word_count: wordCount,
        // Ensure editor_state is not set here — it stays NULL until the
        // user edits and autosave fires.
      })
      .eq('id', documentId)
      .eq('user_id', user.id);

    if (updateError) {
      throw new Error(`Failed to update parsed content: ${updateError.message}`);
    }

    return NextResponse.json({ success: true, documentId });

  } catch (error: unknown) {
    console.error('[process] Error:', error instanceof Error ? error.message : error);

    // Attempt to mark the document as failed (scoped by user_id for safety)
    if (documentId) {
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      if (user) {
        await supabase
          .from('documents')
          .update({ status: 'failed' })
          .eq('id', documentId)
          .eq('user_id', user.id);
      }
    }

    const msg = error instanceof Error ? error.message : 'Processing failed';
    return NextResponse.json({ error: 'PROCESSING_FAILED', message: msg }, { status: 500 });
  }
}
