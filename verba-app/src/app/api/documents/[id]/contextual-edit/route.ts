import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { blockId, paragraphText, originalText, userInstruction } = body;

    if (!blockId || !paragraphText || !originalText || !userInstruction) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 1. Fetch document context for engine
    const { data: doc } = await supabase
      .from('documents')
      .select('work_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (!doc) {
      return NextResponse.json({ success: false, message: 'Document not found' }, { status: 404 });
    }

    const { data: work } = await supabase
      .from('works')
      .select('context')
      .eq('id', doc.work_id)
      .single();

    // 2. Call Verba Engine
    const ENGINE_URL = process.env.VERBA_ENGINE_URL || 'http://localhost:8000';
    const engineRes = await fetch(`${ENGINE_URL}/api/contextual-edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_context: work?.context || {},
        surrounding_context: paragraphText,
        selected_text: originalText,
        user_instruction: userInstruction
      })
    });

    const engineData = await engineRes.json();

    if (!engineRes.ok) {
      return NextResponse.json({ 
        success: false, 
        message: engineData.message || 'Engine failed to process the instruction.',
        error: engineData.error 
      }, { status: engineRes.status });
    }

    // 3. Create Issue & Suggestion in Database
    // Calculate offsets
    const start_offset = paragraphText.indexOf(originalText);
    const end_offset = start_offset + originalText.length;

    if (start_offset === -1) {
      return NextResponse.json({
        success: false,
        message: 'Could not locate the original text within the block.'
      }, { status: 400 });
    }

    const { data: issue, error: issueError } = await supabase
      .from('writing_issues')
      .insert({
        document_id: params.id,
        block_id: blockId,
        start_offset,
        end_offset,
        issue_type: 'contextual_edit',
        original_text: originalText,
        explanation: 'User Instruction: ' + userInstruction,
        status: 'open'
      })
      .select('id')
      .single();

    if (issueError) throw issueError;

    const { data: suggestion, error: suggestionError } = await supabase
      .from('suggestions')
      .insert({
        issue_id: issue.id,
        suggested_text: engineData.suggested_text,
        explanation: engineData.explanation,
        status: 'pending'
      })
      .select('id, suggested_text, explanation, status')
      .single();

    if (suggestionError) throw suggestionError;

    return NextResponse.json({ 
      success: true, 
      issue_id: issue.id,
      suggestion 
    });

  } catch (error) {
    console.error('[contextual-edit]', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
