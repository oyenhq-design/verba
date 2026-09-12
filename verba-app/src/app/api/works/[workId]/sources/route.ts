import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SourceSchema, normalizeDoi } from '@/lib/sources/normalize';

export async function GET(
  request: Request,
  { params }: { params: { workId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: work, error: workError } = await supabase
      .from('works')
      .select('id')
      .eq('id', params.workId)
      .eq('user_id', user.id)
      .single();

    if (workError || !work) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    const { data: sources, error } = await supabase
      .from('work_sources')
      .select('*, identifiers:source_identifiers(*), locations:source_locations(*)')
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
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: work, error: workError } = await supabase
      .from('works')
      .select('id')
      .eq('id', params.workId)
      .eq('user_id', user.id)
      .single();

    if (workError || !work) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    const body = await request.json();
    
    const parseResult = SourceSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid source data', details: parseResult.error.format() }, { status: 400 });
    }

    const sourceData = parseResult.data;
    
    // Deduplication logic
    let existingId: string | null = null;
    if (sourceData.identifiers && sourceData.identifiers.length > 0) {
      const normalizedValues = sourceData.identifiers.map((i: any) => i.normalized_value);
      const { data: matches } = await supabase
        .from('source_identifiers')
        .select('source_id, work_sources!inner(id, work_id)')
        .eq('work_sources.work_id', params.workId)
        .in('normalized_value', normalizedValues);
      
      if (matches && matches.length > 0) {
        existingId = matches[0].source_id;
      }
    }

    if (!existingId && sourceData.doi) {
      const { data: existing, error: dupError } = await supabase
        .from('work_sources')
        .select('id')
        .eq('work_id', params.workId)
        .eq('doi', sourceData.doi)
        .single();
      if (existing) existingId = existing.id;
    } 
    
    if (!existingId && !sourceData.doi && (!sourceData.identifiers || sourceData.identifiers.length === 0)) {
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
          existingId = dup.id;
        }
      }
    }

    if (existingId) {
      return NextResponse.json({ error: 'SOURCE_ALREADY_EXISTS', sourceId: existingId }, { status: 409 });
    }

    const { identifiers, locations, ...baseSourceData } = sourceData;
    
    const { data: inserted, error } = await supabase
      .from('work_sources')
      .insert({
        ...baseSourceData,
        work_id: params.workId,
        user_id: user.id,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Insert identifiers
    if (identifiers && identifiers.length > 0) {
      const idRows = identifiers.map((i: any) => ({ ...i, source_id: inserted.id }));
      await supabase.from('source_identifiers').insert(idRows);
    }

    // Insert locations
    if (locations && locations.length > 0) {
      const locRows = locations.map((l: any) => ({ ...l, source_id: inserted.id }));
      await supabase.from('source_locations').insert(locRows);
    }

    // Return with fetched arrays
    const { data: finalInserted } = await supabase
      .from('work_sources')
      .select('*, identifiers:source_identifiers(*), locations:source_locations(*)')
      .eq('id', inserted.id)
      .single();

    return NextResponse.json(finalInserted || inserted);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
