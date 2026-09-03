import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = createClient();
  try {
    const { documentId, blocks: reqBlocks } = await request.json();
    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }
    if (!Array.isArray(reqBlocks)) {
      return NextResponse.json({ error: 'Missing or invalid blocks payload' }, { status: 400 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Verify document ownership via RLS
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .single();

    if (docError || !docData) {
      return NextResponse.json({ error: 'Document not found or unauthorized' }, { status: 404 });
    }

    // Filter to paragraphs with text
    const paragraphs = reqBlocks.filter(b => b.type === 'paragraph' && typeof b.text === 'string' && b.text.trim().length > 0);

    // 2. Fetch existing issues to avoid re-analysis of unchanged blocks
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
        
        const engineResponse = await fetch(`${engineUrl}/api/analyze`, {
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

              if (startOffset === -1) continue; // safety check

              // Insert Issue
              const { data: insertedIssue, error: insertError } = await supabase
                .from('writing_issues')
                .insert({
                  document_id: documentId,
                  block_id: block.id,
                  issue_type: issue.type,
                  severity: issue.severity || 'medium',
                  original_text: issue.original_text,
                  start_offset: startOffset,
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
          // Mark block as analyzed
          // In a real system, track all analyzed blocks including zero-issue blocks in a `block_analysis` table.
          // For MVP, if it returns 0 issues, it might be re-analyzed later.
        }
      } catch (err) {
        console.error(`Failed to analyze block ${block.id}`, err);
        // Continue to next block
      }
    }

    return NextResponse.json({ success: true, newIssuesCount });

  } catch (error: unknown) {
    console.error('Analysis orchestration error:', error);
    const msg = error instanceof Error ? error.message : 'Analysis failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
