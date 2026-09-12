import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { performResearchSearch } from '@/lib/research/search';

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
    const q = url.searchParams.get('q');
    
    if (!q || q.trim().length === 0) {
      return NextResponse.json({ error: 'Missing query parameter (q)' }, { status: 400 });
    }

    if (q.trim().length > 300) {
      return NextResponse.json({ error: 'Query too long' }, { status: 400 });
    }

    const { results, providerStatus, plan } = await performResearchSearch(q.trim());
    return NextResponse.json({ results, providerStatus, plan });
  } catch (err: any) {
    console.error("Research search error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
