import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, idea } = body;

    // Editor invariant initialization
    // For both 'blank' and 'idea', we want a valid Tiptap state.
    // If 'idea', we put the idea text as the first paragraph.
    const initialContent = type === 'idea' && idea 
      ? [{ type: 'paragraph', content: [{ type: 'text', text: idea }] }]
      : [{ type: 'paragraph' }];

    const editorState = {
      type: 'doc',
      content: initialContent
    };
    
    const parsedContent = {
      sections: [
        {
          id: crypto.randomUUID(),
          title: '',
          level: 1,
          blocks: [
            {
              id: crypto.randomUUID(),
              type: 'paragraph',
              content: type === 'idea' && idea ? idea : ''
            }
          ]
        }
      ]
    };

    const { data: documentId, error: dbError } = await supabase
      .rpc('create_blank_work_document', {
        p_title: type === 'idea' ? 'Untitled Idea' : 'Untitled Document',
        p_editor_state: editorState,
        p_parsed_content: parsedContent
      });

    if (dbError || !documentId) {
      console.error('create_blank_work_document failed', {
        code: dbError?.code,
        message: dbError?.message,
        details: dbError?.details,
        hint: dbError?.hint
      });
      return NextResponse.json({ 
        success: false, 
        error: 'DOCUMENT_CREATE_FAILED',
        code: dbError?.code,
        message: dbError?.message
      }, { status: 500 });
    }

    return NextResponse.json({ documentId });
  } catch (error: any) {
    console.error('Error creating new document:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error?.message }, { status: 500 });
  }
}
