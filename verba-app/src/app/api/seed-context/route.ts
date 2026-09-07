import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get most recent work
    const { data: works, error: worksError } = await supabase
      .from('works')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (worksError || !works || works.length === 0) {
      return NextResponse.json({ error: 'No works found' }, { status: 404 });
    }

    const work = works[0];

    // Update context
    const newContext = {
      work_type: 'Final-year project',
      working_title: 'Automated Agent Testing Framework',
      problem: 'Testing AI agents is hard because they are non-deterministic.',
      aim: 'To develop a robust framework for deterministic agent evaluation.',
      objectives: [
        'Design a mock environment.',
        'Implement an assertion library.',
        'Evaluate with 10 real-world tasks.'
      ],
      scope: 'This covers browser and terminal environments.',
      methodology: 'Empirical testing with human-in-the-loop verification.',
      planned_sections: [
        'Introduction',
        'Theoretical Framework',
        'System Architecture',
        'Methodology',
        'Evaluation',
        'Conclusion'
      ]
    };

    const { error: updateError } = await supabase
      .from('works')
      .update({ context: newContext })
      .eq('id', work.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, workId: work.id, message: "Context populated for test!" });
  } catch (error) {
    console.error('Error in seed-context:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
