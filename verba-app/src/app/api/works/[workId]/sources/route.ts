import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SourceSchema, normalizeDoi } from '@/lib/sources/normalize';

export async function GET(
  request: Request,
  { params }: { params: { workId: string } }
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

    const { data: sources, error } = await supabase
      .from('work_sources')
      .select('*')
      .eq('work_id', params.workId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(sources);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { workId: string } }
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
    
    const parseResult = SourceSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid source data', details: parseResult.error.format() }, { status: 400 });
    }

    const sourceData = parseResult.data;
    
    // Duplicate check logic
    if (sourceData.doi) {
      const { data: existing, error: dupError } = await supabase
        .from('work_sources')
        .select('id')
        .eq('work_id', params.workId)
        .eq('doi', sourceData.doi)
        .single();
        
      if (existing) {
        return NextResponse.json({ error: 'SOURCE_ALREADY_EXISTS', sourceId: existing.id }, { status: 409 });
      }
    } else {
      // Probable duplicate check by title & year & first author family
      const { data: possibleDups } = await supabase
        .from('work_sources')
        .select('id, authors')
        .eq('work_id', params.workId)
        .eq('title', sourceData.title)
        .eq('publication_year', sourceData.publication_year);
        
      if (possibleDups && possibleDups.length > 0 && sourceData.authors && sourceData.authors.length > 0) {
        const familyName = sourceData.authors[0].family.toLowerCase();
        const dup = possibleDups.find((d: any) => 
          d.authors && d.authors.length > 0 && d.authors[0].family.toLowerCase() === familyName
        );
        if (dup) {
          return NextResponse.json({ error: 'SOURCE_ALREADY_EXISTS', sourceId: dup.id }, { status: 409 });
        }
      }
    }

    const { data: inserted, error } = await supabase
      .from('work_sources')
      .insert({
        ...sourceData,
        work_id: params.workId,
        user_id: user.id,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(inserted);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
