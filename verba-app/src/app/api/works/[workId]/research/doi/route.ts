import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { performDoiLookup } from '@/lib/research/search';

export async function GET(
  request: Request,
  { params }: { params: { workId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: work, error: workError } = await supabase
      .from('works')
      .select('id')
      .eq('id', params.workId)
      .eq('user_id', user.id)
      .single();

    if (workError || !work) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const doi = url.searchParams.get('doi');
    const expectedTitle = url.searchParams.get('expectedTitle') || undefined;
    
    if (!doi || doi.trim().length === 0) {
      return NextResponse.json({ error: 'Missing doi parameter' }, { status: 400 });
    }

    const { result, providerStatus } = await performDoiLookup(doi.trim(), expectedTitle);
    
    if (!result) {
      return NextResponse.json({ error: 'DOI not found', providerStatus }, { status: 404 });
    }

    return NextResponse.json({ result, providerStatus });
  } catch (err: any) {
    console.error("Research DOI lookup error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
