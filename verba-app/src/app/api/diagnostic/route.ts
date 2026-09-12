import { NextResponse } from 'next/server';
import { searchOpenAlex } from '@/lib/research/providers/openalex';
import { searchCrossref } from '@/lib/research/providers/crossref';
import { performResearchSearch } from '@/lib/research/search';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const query = url.searchParams.get('q') || 'gas flaring Nigeria';
    
    // 1. OpenAlex
    const openalexRaw = await searchOpenAlex(query);
    const oaSummary = {
      count: openalexRaw.length,
      top5: openalexRaw.slice(0, 5).map(r => ({ title: r.title, doi: r.doi }))
    };

    // 2. Crossref
    const crossrefRaw = await searchCrossref(query);
    const crSummary = {
      count: crossrefRaw.length,
      top5: crossrefRaw.slice(0, 5).map(r => ({ title: r.title, doi: r.doi }))
    };

    // 3. Orchestrated Search
    const searchRes = await performResearchSearch(query);
    const finalResults = searchRes.results.slice(0, 10).map(r => ({
      title: r.source.title,
      doi: r.source.doi,
      provenance: r.provenance.providers,
      openalexReturned: r.provenance.providers.includes('openalex'),
      crossrefReturned: r.provenance.providers.includes('crossref'),
      wasMerged: r.provenance.providers.length > 1,
      relevance: r.integrity.relevance.status,
      reasons: r.integrity.relevance.reasons
    }));

    return NextResponse.json({
      query,
      openAlex: oaSummary,
      crossref: crSummary,
      orchestrated: {
        total: searchRes.results.length,
        top10: finalResults
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
