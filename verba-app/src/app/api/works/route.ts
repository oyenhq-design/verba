import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = createClient();

  try {
    const { initialIdea } = await request.json();

    if (!initialIdea || typeof initialIdea !== 'string' || initialIdea.trim().length === 0) {
      return NextResponse.json({ error: 'Missing or invalid initialIdea' }, { status: 400 });
    }

    // 1. Authenticate via existing Supabase SSR/session architecture
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Create the works row
    const { data: workData, error: workError } = await supabase
      .from('works')
      .insert({
        user_id: user.id,
        initial_idea: initialIdea,
        title: 'Untitled work',
        stage: 'developing',
        context: {
          working_title: null,
          work_type: null,
          field: null,
          topic: null,
          problem: null,
          aim: null,
          objectives: [],
          scope: null,
          methodology: null,
          tools: [],
          geography: null,
          citation_style: null,
          economic_analysis: null,
          focus: null,
          constraints: [],
          context_summary: null
        }
      })
      .select('id')
      .single();

    if (workError || !workData) {
      console.error('[works API] Error creating work:', workError?.message);
      return NextResponse.json({ error: 'Failed to create work' }, { status: 500 });
    }

    // 3. Persist the initial idea as the first work_messages row
    const { error: messageError } = await supabase
      .from('work_messages')
      .insert({
        work_id: workData.id,
        user_id: user.id,
        role: 'user',
        content: initialIdea
      });

    if (messageError) {
      console.error('[works API] Error creating initial message:', messageError.message);
      // We don't fail the whole request if just the message insertion fails,
      // but we should log it.
    }

    // 4. Return the new workId
    return NextResponse.json({ workId: workData.id });

  } catch (error: unknown) {
    console.error('[works API] Unexpected error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
