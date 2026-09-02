import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { documentId, blockId, issueId, paragraphText } = await request.json();
    if (!documentId || !blockId || !issueId || !paragraphText) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch existing issue and previous suggestion
    const { data: issue, error: issueError } = await supabase
      .from('writing_issues')
      .select('*')
      .eq('id', issueId)
      .single();

    if (issueError || !issue) {
      throw new Error('Issue not found');
    }

    const { data: prevSuggestion } = await supabase
      .from('suggestions')
      .select('*')
      .eq('issue_id', issueId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const previousSuggestionText = prevSuggestion ? prevSuggestion.suggested_text : '';

    // Call Python Engine
    const engineResponse = await fetch('http://127.0.0.1:8000/api/analyze/alternative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: "", // We can omit context for alternative generation or fetch it
        paragraph_text: paragraphText,
        issue: {
          type: issue.issue_type,
          original_text: issue.original_text,
          suggested_text: previousSuggestionText,
          explanation: issue.explanation
        }
      }),
    });

    if (!engineResponse.ok) {
      const errorText = await engineResponse.text();
      throw new Error(`Python engine error: ${errorText}`);
    }

    const result = await engineResponse.json();

    if (result.suggested_text) {
      // Insert new suggestion
      const { data: newSuggestion, error: insertError } = await supabase
        .from('suggestions')
        .insert({
          document_id: documentId,
          block_id: blockId,
          issue_id: issueId,
          original_text: issue.original_text,
          suggested_text: result.suggested_text,
          explanation: result.explanation || issue.explanation,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      return NextResponse.json({ success: true, suggestion: newSuggestion });
    }

    throw new Error('No alternative generated');

  } catch (error: unknown) {
    console.error('Alternative generation error:', error);
    const msg = error instanceof Error ? error.message : 'Alternative generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
