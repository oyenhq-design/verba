/**
 * POST /api/works/[workId]/research/evidence
 *
 * H4: Contextual Evidence Search Orchestrator
 *
 * Given a selected claim and surrounding paragraph context, this endpoint:
 *   1. Extracts a study fingerprint (using project_context for boosting)
 *   2. Generates targeted scholarly queries
 *   3. Searches Crossref + OpenAlex in parallel
 *   4. Deduplicates candidates
 *   5. Scores and ranks candidates based on match fit
 *   6. Analyzes top candidates to determine Evidence Relationship (Supports/Qualifies)
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
const MAX_CANDIDATES_TO_ANALYZE = 8;

export async function POST(
  request: Request,
  { params }: { params: { workId: string } }
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
      .select('id, context')
      .eq('id', params.workId)
      .eq('user_id', user.id)
      .single();

    if (workError || !work) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    // 3. Parse body
    const body = await request.json();
    const { selected_claim, paragraph_context } = body as {
      selected_claim?: string;
      paragraph_context?: string;
    };

    if (!selected_claim || selected_claim.trim().length < 5) {
      return NextResponse.json(
        { error: 'selected_claim is required and must be meaningful' },
        { status: 400 }
      );
    }

    // 4. Build claim scope from provided text
    const scope = extractClaimScope('evidence_search', null, selected_claim);
    if (paragraph_context && paragraph_context !== selected_claim) {
      scope.paragraphContext = paragraph_context;
    }

    // 5. Classify mode (for evidence finding, usually 'supporting_research')
    const mode = classifyRecoveryMode(scope);

    // 6. Extract study fingerprint, injecting project context
    const fingerprint = extractStudyFingerprint(scope, work.context || {});

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

      // For evidence finding, stop if we found at least 2 good sources
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

    // Map the deterministic fit labels to Evidence Relationships for the UI
    const mapEvidenceRelationship = (fit: string) => {
      switch (fit) {
        case 'likely_intended_source':
          return {
            relationship: 'Direct Support',
            conversationalText: 'This source is highly relevant and appears to directly match the specifics of your claim.'
          };
        case 'possible_supporting_source':
          return {
            relationship: 'Supporting Evidence',
            conversationalText: 'This looks like solid supporting evidence for the general topic.'
          };
        case 'related_research':
        default:
          return {
            relationship: 'Related Research',
            conversationalText: 'This paper is related, but you might need to check if it supports the exact details of your claim.'
          };
      }
    };

    // 13. Serialize for client
    const candidates = finalRanked.map((c) => {
      const evidenceData = mapEvidenceRelationship(c.fit);
      
      return {
        source: c.source,
        providers: c.providers,
        fit: c.fit,
        relationship: evidenceData.relationship,
        conversationalText: evidenceData.conversationalText,
        matchedAspects: c.matchedAspects,
        unmatchedAspects: c.unmatchedAspects,
        evidenceLevel: c.evidenceLevel,
        evidenceCheckedLabel: c.evidenceCheckedLabel,
        numericalAnchors: c.numericalAnchors,
        retracted: c.retracted,
        doi: c.doi,
        sourceUrl: c.sourceUrl,
        // Integrate with the standard Integrity shape for the UI
        integrity: {
          retraction: c.retracted ? 'retracted' : 'none',
          access: { status: c.evidenceLevel >= 2 ? 'open' : 'closed', pdf_url: c.sourceUrl },
          identity: { status: c.evidenceLevel >= 1 ? 'confirmed' : 'partial', reasons: [] },
          relevance: { 
            status: c.fit === 'likely_intended_source' ? 'high' : c.fit === 'possible_supporting_source' ? 'medium' : 'low',
            reasons: c.matchedAspects.map(a => `Matches ${a.toLowerCase()}`)
          },
          evidence_availability: c.evidenceCheckedLabel
        },
        provenance: { providers: c.providers, provider_ids: {}, provider_fields: {} }
      };
    });

    return NextResponse.json({
      mode,
      fingerprint,
      results: candidates, // Use 'results' instead of candidates so it drops into ResearchTab's existing map easily
      providerStatus,
      totalRaw: rawCandidates.length,
      totalDeduped: finalDeduplicatedCount,
    });
  } catch (err: any) {
    console.error('[evidence search] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
