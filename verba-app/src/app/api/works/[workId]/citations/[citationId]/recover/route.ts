/**
 * POST /api/works/[workId]/citations/[citationId]/recover
 *
 * H2E: Citation Recovery Orchestrator
 *
 * Given a claim scope (candidateClaimText from the editor), runs the full
 * recovery pipeline:
 *   1. Classify recovery mode (intended_source | supporting_research | better_source)
 *   2. Extract study fingerprint
 *   3. Generate targeted scholarly queries
 *   4. Search Crossref + OpenAlex in parallel (multiple queries)
 *   5. Deduplicate candidates
 *   6. Score and rank
 *   7. Analyze top candidates (matched aspects, fit, evidence labels)
 *   8. Return ranked candidates
 *
 * Security:
 *   - Authenticated user required
 *   - Work ownership verified
 *   - Provider calls are server-side only
 *   - No credentials exposed to client
 *
 * No database migration required. Candidate recommendations are ephemeral.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchCrossref } from '@/lib/research/providers/crossref';
import { searchOpenAlex } from '@/lib/research/providers/openalex';
import { NormalizedSource } from '@/lib/sources/types';
import {
  classifyRecoveryMode,
  extractStudyFingerprint,
  generateRecoveryQueries,
  deduplicateCandidates,
  scoreCandidate,
} from '@/lib/citations/recovery';
import { analyzeCandidate, rankCandidates, CandidateAnalysis } from '@/lib/citations/candidateMatch';
import { extractClaimScope } from '@/lib/citations/scope';

const MAX_RESULTS_PER_QUERY = 10;
const MAX_CANDIDATES_TO_ANALYZE = 5;

export async function POST(
  request: Request,
  { params }: { params: { workId: string; citationId: string } }
) {
  try {
    const supabase = createClient();

    // 1. Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Work ownership
    const { data: work, error: workError } = await supabase
      .from('works')
      .select('id')
      .eq('id', params.workId)
      .eq('user_id', user.id)
      .single();

    if (workError || !work) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    // 3. Parse body
    const body = await request.json();
    const { candidateClaimText, sourceId } = body as {
      candidateClaimText?: string;
      sourceId?: string | null;
    };

    if (!candidateClaimText || candidateClaimText.trim().length < 10) {
      return NextResponse.json(
        { error: 'candidateClaimText is required and must be meaningful' },
        { status: 400 }
      );
    }

    // 4. Build claim scope from provided text
    const scope = extractClaimScope(params.citationId, sourceId || null, candidateClaimText);

    // 5. Classify recovery mode
    const mode = classifyRecoveryMode(scope);

    // 6. Extract study fingerprint
    const fingerprint = extractStudyFingerprint(scope);

    // 7. Generate queries
    const queries = generateRecoveryQueries(fingerprint, mode);

    if (queries.length === 0) {
      return NextResponse.json({
        mode,
        fingerprint,
        candidates: [],
        providerStatus: {},
        message: 'Could not generate search queries from the provided text.',
      });
    }

    // 8. Search providers (progressive relaxation)
    const providerStatus: Record<string, string> = {};
    const rawCandidates: { source: NormalizedSource; provider: string }[] = [];
    let finalRanked: CandidateAnalysis[] = [];
    let finalDeduplicatedCount = 0;

    const queriesByStage = [
      queries.filter(q => q.stage === 1),
      queries.filter(q => q.stage === 2),
      queries.filter(q => q.stage === 3),
    ];

    for (const stageQueries of queriesByStage) {
      if (stageQueries.length === 0) continue;

      await Promise.all(
        stageQueries.map(async (q) => {
          let crossrefResults: NormalizedSource[] = [];
          let openalexResults: NormalizedSource[] = [];

          try {
            crossrefResults = await searchCrossref(q.query, MAX_RESULTS_PER_QUERY);
            providerStatus.crossref = 'ok';
          } catch (e: any) {
            providerStatus.crossref = e.message || 'error';
          }

          try {
            openalexResults = await searchOpenAlex(q.query, MAX_RESULTS_PER_QUERY);
            providerStatus.openalex = 'ok';
          } catch (e: any) {
            providerStatus.openalex = e.message || 'error';
          }

          for (const s of crossrefResults) rawCandidates.push({ source: s, provider: 'crossref' });
          for (const s of openalexResults) rawCandidates.push({ source: s, provider: 'openalex' });
        })
      );

      const deduplicated = deduplicateCandidates(rawCandidates);
      finalDeduplicatedCount = deduplicated.length;

      const scored = deduplicated
        .map(({ source, providers }) => ({
          source,
          providers,
          score: scoreCandidate(source, fingerprint),
        }))
        .sort((a, b) => b.score.totalScore - a.score.totalScore);

      const topCandidates = scored.slice(0, MAX_CANDIDATES_TO_ANALYZE);
      const analyses: CandidateAnalysis[] = topCandidates.map(({ source, providers }) =>
        analyzeCandidate(source, providers, fingerprint, mode)
      );

      finalRanked = rankCandidates(analyses);

      let shouldStop = false;

      if (mode === 'intended_source') {
        shouldStop = finalRanked.some(
          c =>
            c.fit === 'likely_intended_source' &&
            c.score.anchorScore >= 10 &&
            c.evidenceLevel >= 1 &&
            !c.retracted
        );
      } else if (mode === 'supporting_research') {
        shouldStop = finalRanked.filter(
          c =>
            !c.retracted &&
            (c.fit === 'likely_intended_source' || c.fit === 'possible_supporting_source')
        ).length >= 2;
      } else {
        shouldStop = finalRanked.filter(
          c => !c.retracted && c.score.anchorScore >= 6
        ).length >= 2;
      }

      if (shouldStop) {
        break; // Stop progressive relaxation
      }
    }

    // 13. Serialize for client (strip non-serializable internals)
    const candidates = finalRanked.map((c) => ({
      source: c.source,
      providers: c.providers,
      fit: c.fit,
      fitLabel: c.fitLabel,
      fitReason: c.fitReason,
      matchedAspects: c.matchedAspects,
      unmatchedAspects: c.unmatchedAspects,
      evidenceLevel: c.evidenceLevel,
      evidenceCheckedLabel: c.evidenceCheckedLabel,
      numericalAnchors: c.numericalAnchors,
      retracted: c.retracted,
      doi: c.doi,
      sourceUrl: c.sourceUrl,
      score: {
        totalScore: c.score.totalScore,
        anchorScore: c.score.anchorScore,
        matchedAnchors: c.score.matchedAnchors,
        missingAnchors: c.score.missingAnchors,
      },
    }));

    return NextResponse.json({
      mode,
      fingerprint,
      queries: queries.map((q) => ({ stage: q.stage, rationale: q.rationale })),
      candidates,
      providerStatus,
      totalRaw: rawCandidates.length,
      totalDeduped: finalDeduplicatedCount,
    });
  } catch (err: any) {
    console.error('[recover] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
