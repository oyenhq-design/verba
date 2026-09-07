import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SourceSchema } from '@/lib/sources/normalize';

export async function PATCH(
  request: Request,
  { params }: { params: { workId: string, sourceId: string } }
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
    
    // We only validate the parts that are sent, so partial schema or just validate full schema if they send full object
    const parseResult = SourceSchema.partial().safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid source data', details: parseResult.error.format() }, { status: 400 });
    }

    const updateData = parseResult.data;

    // Do not allow updating immutable fields
    delete (updateData as any).user_id;
    delete (updateData as any).work_id;
    delete (updateData as any).id;
    delete (updateData as any).created_at;

    const { data: updated, error } = await supabase
      .from('work_sources')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.sourceId)
      .eq('work_id', params.workId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { workId: string, sourceId: string } }
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

    // Attempt deletion
    const { error } = await supabase
      .from('work_sources')
      .delete()
      .eq('id', params.sourceId)
      .eq('work_id', params.workId);

    if (error) {
      // Postgres error 23503 is foreign_key_violation
      if (error.code === '23503') {
        return NextResponse.json({ 
          error: 'SOURCE_IN_USE', 
          message: 'This source is used in this document. Remove its citations before deleting it.'
        }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
