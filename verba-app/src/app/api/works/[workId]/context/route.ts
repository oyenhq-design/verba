import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ALLOWED_CONTEXT_KEYS = new Set([
  'working_title', 'work_type', 'field', 'topic', 'problem', 'aim', 
  'objectives', 'scope', 'methodology', 'tools', 'geography', 
  'citation_style', 'economic_analysis', 'focus', 'constraints', 'context_summary'
]);

export async function PATCH(
  request: Request,
  { params }: { params: { workId: string } }
) {
  const supabase = createClient();
  const { workId } = params;

  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch work to verify ownership
    const { data: work, error: workError } = await supabase
      .from('works')
      .select('id, user_id, context, title')
      .eq('id', workId)
      .single();

    if (workError || !work || work.user_id !== user.id) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    // 3. Merge context updates securely
    const updatedContext = { ...work.context };
    let nextTitle = work.title;

    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_CONTEXT_KEYS.has(key)) {
        updatedContext[key] = value;
      }
    }

    if (work.title === 'Untitled work' && updatedContext.working_title) {
      nextTitle = updatedContext.working_title;
    } else if (updatedContext.working_title) {
        nextTitle = updatedContext.working_title;
    }

    // Always update updated_at
    const { data: updatedWork, error: updateError } = await supabase
      .from('works')
      .update({
        context: updatedContext,
        title: nextTitle,
        updated_at: new Date().toISOString()
      })
      .eq('id', workId)
      .select('context, title')
      .single();

    if (updateError) {
      console.error('[context API] Failed to update work context:', updateError);
      return NextResponse.json({ error: 'Failed to update context' }, { status: 500 });
    }

    // 4. Return the complete updated state
    return NextResponse.json({
      context: updatedWork.context,
      title: updatedWork.title,
    });

  } catch (error: unknown) {
    console.error('[context API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
