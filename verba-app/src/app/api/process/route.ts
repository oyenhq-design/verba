import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = createClient();
  let documentId: string | null = null;

  try {
    const body = await request.json();
    const { documentId, title, originalFilename, mimeType, fileSize, storagePath } = body;

    if (!documentId || !storagePath) {
      return NextResponse.json({ error: 'Missing document parameters' }, { status: 400 });
    }

    // 1. Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify storage path belongs to user
    if (!storagePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Unauthorized storage path' }, { status: 403 });
    }

    // 3. Download from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file from storage: ${downloadError?.message}`);
    }

    // 4. Send to Python FastAPI Engine
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

    // 5. Calculate word count deterministically from parsed blocks
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

    // 6. Atomically Create Work and Document via RPC
    const { error: rpcError } = await supabase.rpc('create_uploaded_work_document', {
      p_document_id: documentId,
      p_user_id: user.id,
      p_title: title,
      p_original_filename: originalFilename,
      p_mime_type: mimeType,
      p_file_size: fileSize,
      p_storage_path: storagePath,
      p_parsed_content: parsedJson,
      p_word_count: wordCount
    });

    if (rpcError) {
      throw new Error(`Failed to create work and document: ${rpcError.message}`);
    }

    // 7. Log document_uploaded provenance event
    const fileSizeBytes = fileData.size || 0;
    const { error: eventError } = await supabase
      .from('document_events')
      .insert({
        document_id: documentId,
        user_id: user.id,
        event_type: 'document_uploaded',
        metadata: {
          file_type: 'docx',
          file_size_bytes: fileSizeBytes
        }
      });
      
    if (eventError) {
      console.error('[process] Non-critical failure logging document_uploaded:', eventError.message);
    }

    return NextResponse.json({ success: true, documentId });

  } catch (error: unknown) {
    console.error('[process] Error:', error instanceof Error ? error.message : error);

    // If it failed and we already created the DB row, we'd update status to failed.
    // However, we now only create the DB row on success. If it fails midway, no DB row exists yet.
    // We can still try to mark as failed *if* it somehow exists, but generally it won't.
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
