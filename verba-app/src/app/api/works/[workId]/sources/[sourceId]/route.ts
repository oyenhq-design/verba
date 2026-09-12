import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SourceSchema } from '@/lib/sources/normalize';

export async function PATCH(
  request: Request,
  { params }: { params: { workId: string, sourceId: string } }
) {
  try {
    const supabase = createClient();

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

    const { identifiers, locations, ...baseUpdateData } = updateData as any;

    const { data: updated, error } = await supabase
      .from('work_sources')
      .update({
        ...baseUpdateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.sourceId)
      .eq('work_id', params.workId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (identifiers) {
      await supabase.from('source_identifiers').delete().eq('source_id', params.sourceId);
      if (identifiers.length > 0) {
        await supabase.from('source_identifiers').insert(identifiers.map((i: any) => ({ ...i, source_id: params.sourceId })));
      }
    }

    if (locations) {
      await supabase.from('source_locations').delete().eq('source_id', params.sourceId);
      if (locations.length > 0) {
        await supabase.from('source_locations').insert(locations.map((l: any) => ({ ...l, source_id: params.sourceId })));
      }
    }

    const { data: finalUpdated } = await supabase
      .from('work_sources')
      .select('*, identifiers:source_identifiers(*), locations:source_locations(*)')
      .eq('id', params.sourceId)
      .single();

    return NextResponse.json(finalUpdated || updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { workId: string, sourceId: string } }
) {
  try {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Precheck: does any document_citations row reference this source?
    // This gives a precise 409 with citation count before hitting the FK.
    // The FK constraint remains the final DB-level guarantee.
    const { count: citCount } = await supabase
      .from('document_citations')
      .select('id', { count: 'exact', head: true })
      .eq('work_source_id', params.sourceId);

    if (citCount && citCount > 0) {
      return NextResponse.json({
        error: 'SOURCE_IN_USE',
        message: `This source is used by ${citCount} citation${citCount === 1 ? '' : 's'} in your document. Remove the citation${citCount === 1 ? '' : 's'} before deleting this source.`,
        citationCount: citCount,
      }, { status: 409 });
    }

    // Attempt deletion — FK constraint is the final guarantee
    const { error } = await supabase
      .from('work_sources')
      .delete()
      .eq('id', params.sourceId)
      .eq('work_id', params.workId);

    if (error) {
      // Postgres 23503 = foreign_key_violation (race condition after precheck)
      if (error.code === '23503') {
        return NextResponse.json({
          error: 'SOURCE_IN_USE',
          message: 'This source is currently used by one or more citations. Remove them before deleting.',
        }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
