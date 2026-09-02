import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { documentId } = await request.json();
    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
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

    const engineResponse = await fetch('http://127.0.0.1:8000/api/parse', {
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
      parsedJson.sections.forEach((section: any) => {
        section.blocks?.forEach((block: any) => {
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

  } catch (error: any) {
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
    } catch (e) {
      // ignore
    }
    return NextResponse.json({ error: error.message || 'Processing failed' }, { status: 500 });
  }
}
