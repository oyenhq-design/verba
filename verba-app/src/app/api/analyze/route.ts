import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Error codes from the engine that indicate a systemic failure —
// no point continuing to send more blocks if these are returned.
const SYSTEMIC_ERROR_CODES = new Set([
  'OPENAI_AUTH_FAILED',
  'OPENAI_QUOTA_EXCEEDED',
  'OPENAI_TIMEOUT',
  'ENGINE_INTERNAL_ERROR',
]);

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

    // Resolve engine URL once — fail fast if missing in production
    let engineUrl = process.env.VERBA_ENGINE_URL;
    if (!engineUrl) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'ENGINE_CONFIG_MISSING', message: 'VERBA_ENGINE_URL is not configured.' },
          { status: 500 }
        );
      }
      engineUrl = 'http://localhost:8000';
    }

    // Filter to paragraphs with text
    const paragraphs = reqBlocks.filter(
      b => b.type === 'paragraph' && typeof b.text === 'string' && b.text.trim().length > 0
    );

    // 2. Fetch existing issues to avoid re-analysis of already-analysed blocks
    const { data: existingIssues, error: issuesError } = await supabase
      .from('writing_issues')
      .select('block_id')
      .eq('document_id', documentId);

    if (issuesError) {
      throw new Error(`Failed to fetch existing issues: ${issuesError.message}`);
    }

    const analyzedBlockIds = new Set(existingIssues.map(i => i.block_id));
    let newIssuesCount = 0;
    let engineFailureCode: string | null = null;

    // 3. Analyze un-analyzed blocks — abort early on systemic engine errors
    for (let i = 0; i < paragraphs.length; i++) {
      const block = paragraphs[i];
      if (analyzedBlockIds.has(block.id)) {
        continue;
      }

      const context = i > 0 ? paragraphs[i - 1].text : '';

      let engineResponse: Response;
      try {
        engineResponse = await fetch(`${engineUrl}/api/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: context,
            paragraph_text: block.text,
          }),
        });
      } catch (fetchErr) {
        // Network-level failure (engine unreachable)
        console.error(`[analyze] Engine unreachable for block ${block.id}:`, fetchErr);
        engineFailureCode = 'ENGINE_UNREACHABLE';
        break; // No point trying further blocks
      }

      if (!engineResponse.ok) {
        // Parse the structured error from the engine
        let errorBody: { error?: string; message?: string } = {};
        try {
          errorBody = await engineResponse.json();
        } catch {
          // non-JSON body
        }
        const errorCode = errorBody.error || 'ANALYSIS_FAILED';
        console.error(`[analyze] Engine returned ${engineResponse.status} for block ${block.id}: ${errorCode} — ${errorBody.message}`);

        if (SYSTEMIC_ERROR_CODES.has(errorCode)) {
          // Systemic failure — abort immediately, report to caller
          engineFailureCode = errorCode;
          break;
        }
        // Non-systemic block-level failure — skip this block and continue
        continue;
      }

      const result = await engineResponse.json();

      if (result.needs_revision && result.issues && result.issues.length > 0) {
        for (const issue of result.issues) {
          const startOffset = block.text.indexOf(issue.original_text);
          const endOffset = startOffset !== -1 ? startOffset + issue.original_text.length : null;

          if (startOffset === -1) continue;

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
              status: 'open',
            })
            .select()
            .single();

          if (!insertError && insertedIssue) {
            await supabase.from('suggestions').insert({
              document_id: documentId,
              block_id: block.id,
              issue_id: insertedIssue.id,
              original_text: issue.original_text,
              suggested_text: issue.suggested_text,
              explanation: issue.explanation,
              status: 'pending',
            });
            newIssuesCount++;
          }
        }
      }
    }

    // If the engine failed systemically, return a structured failure
    // so the UI can display "Analysis failed" rather than "Analysis Complete".
    if (engineFailureCode && newIssuesCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: engineFailureCode,
          message: getEngineErrorMessage(engineFailureCode),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, newIssuesCount });

  } catch (error: unknown) {
    console.error('[analyze] Orchestration error:', error);
    const msg = error instanceof Error ? error.message : 'Analysis failed';
    return NextResponse.json({ error: 'ORCHESTRATION_ERROR', message: msg }, { status: 500 });
  }
}

function getEngineErrorMessage(code: string): string {
  switch (code) {
    case 'OPENAI_AUTH_FAILED':
      return 'The analysis service is not authorised with OpenAI. Please contact support.';
    case 'OPENAI_QUOTA_EXCEEDED':
      return 'OpenAI usage limit reached. Please try again later.';
    case 'OPENAI_TIMEOUT':
      return 'The analysis service timed out. Please try again.';
    case 'ENGINE_UNREACHABLE':
      return 'The analysis service is currently unavailable. Please try again shortly.';
    default:
      return 'Analysis failed due to an internal error. Please try again.';
  }
}
