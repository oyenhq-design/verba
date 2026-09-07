import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${cookies().get('sb-access-token')?.value || ''}`,
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { work_source_id, locator, prefix, suffix } = body;

    if (!work_source_id) {
      return NextResponse.json({ error: 'Missing work_source_id' }, { status: 400 });
    }

    // Insert citation (RLS triggers and policies will enforce document ownership, 
    // work matching, and user ownership)
    const { data: inserted, error } = await supabase
      .from('document_citations')
      .insert({
        document_id: params.id,
        work_source_id,
        user_id: user.id,
        locator: locator || null,
        prefix: prefix || null,
        suffix: suffix || null,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      citationId: inserted.id, 
      sourceId: inserted.work_source_id 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
