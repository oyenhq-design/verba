import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { documentId } = await request.json();
    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    // 1. Fetch document and parsed content
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .select('parsed_content')
      .eq('id', documentId)
      .single();

    if (docError || !docData || !docData.parsed_content) {
      throw new Error(`Failed to fetch document: ${docError?.message}`);
    }

    const blocks = docData.parsed_content.sections?.[0]?.blocks || [];
    const paragraphs = blocks.filter((b: any) => b.type === 'paragraph' && b.text?.trim().length > 0);

    // 2. Fetch existing issues to avoid re-analysis
    const { data: existingIssues, error: issuesError } = await supabase
      .from('writing_issues')
      .select('block_id')
      .eq('document_id', documentId);

    if (issuesError) {
      throw new Error(`Failed to fetch existing issues: ${issuesError.message}`);
    }

    const analyzedBlockIds = new Set(existingIssues.map(i => i.block_id));
    let newIssuesCount = 0;

    // 3. Analyze un-analyzed blocks
    for (let i = 0; i < paragraphs.length; i++) {
      const block = paragraphs[i];
      if (analyzedBlockIds.has(block.id)) {
        continue;
      }

      // Prepare context (previous block text)
      const context = i > 0 ? paragraphs[i - 1].text : '';

      try {
        const engineResponse = await fetch('http://127.0.0.1:8000/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: context,
            paragraph_text: block.text
          }),
        });

        if (engineResponse.ok) {
          const result = await engineResponse.json();
          if (result.needs_revision && result.issues && result.issues.length > 0) {
            
            // Insert each issue and its suggestion
            for (const issue of result.issues) {
              
              // Find offset in original text
              const startOffset = block.text.indexOf(issue.original_text);
              const endOffset = startOffset !== -1 ? startOffset + issue.original_text.length : null;

              // Insert Issue
              const { data: insertedIssue, error: insertError } = await supabase
                .from('writing_issues')
                .insert({
                  document_id: documentId,
                  block_id: block.id,
                  issue_type: issue.type,
                  severity: issue.severity || 'medium',
                  original_text: issue.original_text,
                  start_offset: startOffset !== -1 ? startOffset : null,
                  end_offset: endOffset,
                  explanation: issue.explanation,
                  status: 'open'
                })
                .select()
                .single();

              if (!insertError && insertedIssue) {
                // Insert Suggestion
                await supabase
                  .from('suggestions')
                  .insert({
                    document_id: documentId,
                    block_id: block.id,
                    issue_id: insertedIssue.id,
                    original_text: issue.original_text,
                    suggested_text: issue.suggested_text,
                    explanation: issue.explanation,
                    status: 'pending'
                  });
                newIssuesCount++;
              }
            }
          }
          // Mark block as analyzed (even if no issues, we could track this in a separate table, 
          // but for now, we just rely on `writing_issues` existence. If it has no issues, it will be re-analyzed next time.
          // To fix this, we should really track analyzed blocks, but this is fine for MVP)
        }
      } catch (err) {
        console.error(`Failed to analyze block ${block.id}`, err);
        // Continue to next block
      }
    }

    return NextResponse.json({ success: true, newIssuesCount });

  } catch (error: any) {
    console.error('Analysis orchestration error:', error);
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 });
  }
}
