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

    const documentId = crypto.randomUUID();

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

    const newDocument = {
      id: documentId,
      user_id: user.id,
      title: type === 'idea' ? 'Untitled Idea' : 'Untitled Document',
      original_filename: '',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_size: 0,
      storage_path: '',
      status: 'ready',
      word_count: type === 'idea' && idea ? idea.split(/\s+/).length : 0,
      editor_version: 1,
      editor_state: editorState,
      parsed_content: parsedContent
    };

    const { error: dbError } = await supabase
      .from('documents')
      .insert(newDocument);

    if (dbError) {
      console.error('Database insertion error:', dbError);
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
    }

    return NextResponse.json({ documentId });
  } catch (error) {
    console.error('Error creating new document:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
