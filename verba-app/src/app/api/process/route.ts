import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = createClient();
  try {
    const { documentId } = await request.json();
    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Mark as processing
    await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId);

    // 2. Get document record for storage path
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .select('storage_path')
      .eq('id', documentId)
      .single();

    if (docError || !docData) {
      throw new Error(`Failed to fetch document record: ${docError?.message}`);
    }

    // 3. Download from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(docData.storage_path);

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

    // 5. Calculate word count roughly
    let wordCount = 0;
    if (parsedJson.sections) {
      parsedJson.sections.forEach((section: { blocks?: { text?: string }[] }) => {
        section.blocks?.forEach((block: { text?: string }) => {
          if (block.text) {
            wordCount += block.text.trim().split(/\s+/).length;
          }
        });
      });
    }

    // 6. Save JSON and mark as ready
    const { error: updateError } = await supabase
      .from('documents')
      .update({ 
        status: 'ready',
        parsed_content: parsedJson,
        word_count: wordCount
      })
      .eq('id', documentId);

    if (updateError) {
      throw new Error(`Failed to update parsed content: ${updateError.message}`);
    }

    return NextResponse.json({ success: true, documentId });

  } catch (error: unknown) {
    console.error('Processing error:', error);
    // Try to mark as failed
    try {
      const { documentId } = await request.json().catch(() => ({}));
      if (documentId) {
        await supabase
          .from('documents')
          .update({ status: 'failed' })
          .eq('id', documentId);
      }
    } catch {
      // ignore
    }
    const msg = error instanceof Error ? error.message : 'Processing failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
