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
import { planResearchQuery } from '@/lib/research/planner';
import { executeProviders, ProviderExecutionStatus } from '@/lib/research/executor';
import { NormalizedSource, SourceProvider } from '@/lib/sources/types';
import {
  classifyRecoveryMode,
  extractStudyFingerprint,
  generateRecoveryQueries,
  deduplicateCandidates,
  scoreCandidate,
} from '@/lib/citations/recovery';
import { analyzeCandidate, rankCandidates, CandidateAnalysis } from '@/lib/citations/candidateMatch';
import { extractClaimScope } from '@/lib/citations/scope';
import { calculateRelevance, extractAccess } from '@/lib/research/integrity';
import { upsertClaim } from '@/lib/evidence/claims';

const MAX_RESULTS_PER_QUERY = 10;
const MAX_CANDIDATES_TO_ANALYZE = 8;

/**
 * Evaluates whether the currently discovered candidate pool is strong enough
 * to skip fallback execution or stop query relaxation.
 */
function isEvidenceSufficient(finalRanked: CandidateAnalysis[], mode: string): boolean {
  if (mode === 'intended_source') {
    return finalRanked.some(
      c =>
        c.fit === 'likely_intended_source' &&
        c.score.anchorScore >= 10 &&
        c.evidenceLevel >= 1 &&
        !c.retracted
    );
  } else if (mode === 'supporting_research') {
    return finalRanked.filter(
      c =>
        !c.retracted &&
        (c.fit === 'likely_intended_source' || c.fit === 'possible_supporting_source')
    ).length >= 2;
  } else {
    return finalRanked.filter(
      c => !c.retracted && c.score.anchorScore >= 6
    ).length >= 2;
  }
}

function shouldRunEvidenceFallback(finalRanked: CandidateAnalysis[], mode: string): boolean {
  // If we already have a very strong source, no need for fallback
  if (isEvidenceSufficient(finalRanked, mode)) return false;

  // Otherwise, run fallback if we have fewer than 4 usable structured results
  const usableCount = finalRanked.filter(c => !c.retracted && c.score.anchorScore >= 4).length;
  return usableCount < 4;
}

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
    const { selected_claim, paragraph_context, is_passage_search, document_id, block_id } = body as {
      selected_claim?: string;
      paragraph_context?: string;
      is_passage_search?: boolean;
      document_id?: string;
      block_id?: string;
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

    // 5b. Upsert Claim if persistent identity exists
    let persistedClaimId = null;
    if (document_id && block_id) {
      try {
        persistedClaimId = await upsertClaim(supabase, {
          workId: params.workId,
          documentId: document_id,
          userId: user.id,
          blockId: block_id,
          claimText: selected_claim,
          // Extract offsets if we start tracking them in the payload
        });
      } catch (e) {
        console.error('[evidence search] Failed to upsert claim:', e);
      }
    }

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

    // 8. Plan Research
    const plan = planResearchQuery(selected_claim, 'find_evidence');

    // 9. Search providers (progressive relaxation)
    const providerStatus: Record<string, string> = {};
    const rawCandidates: { source: NormalizedSource; provider: SourceProvider }[] = [];
    let finalRanked: CandidateAnalysis[] = [];
    let finalDeduplicatedCount = 0;

    const queriesByStage = [
      queries.filter(q => q.stage === 1),
      queries.filter(q => q.stage === 2),
      queries.filter(q => q.stage === 3),
    ];

    for (const stageQueries of queriesByStage) {
      if (stageQueries.length === 0) continue;

      // --- PRIMARY PROVIDERS ---
      await Promise.all(
        stageQueries.map(async (q) => {
          const { rawCandidates: batchCandidates, providerStatus: batchStatus } = await executeProviders(plan.primaryProviders, q.query);
          
          for (const c of batchCandidates) {
             rawCandidates.push(c);
          }
          
          // Merge provider status safely
          for (const [p, s] of Object.entries(batchStatus)) {
             providerStatus[p] = s.error ? s.error : s.status;
          }
        })
      );

      let deduplicated = deduplicateCandidates(rawCandidates);
      finalDeduplicatedCount = deduplicated.length;

      let scored = deduplicated
        .map(({ source, providers }) => ({
          source,
          providers,
          score: scoreCandidate(source, fingerprint),
        }))
        .sort((a, b) => b.score.totalScore - a.score.totalScore);

      let topCandidates = scored.slice(0, MAX_CANDIDATES_TO_ANALYZE);
      let analyses: CandidateAnalysis[] = topCandidates.map(({ source, providers }) =>
        analyzeCandidate(source, providers, fingerprint, mode)
      );

      finalRanked = rankCandidates(analyses);

      // --- FALLBACK CHECK ---
      if (shouldRunEvidenceFallback(finalRanked, mode) && plan.fallbackProviders.length > 0) {
        await Promise.all(
          stageQueries.map(async (q) => {
            const { rawCandidates: batchCandidates, providerStatus: batchStatus } = await executeProviders(plan.fallbackProviders, q.query);
            
            for (const c of batchCandidates) {
               rawCandidates.push(c);
            }
            
            // Merge provider status safely
            for (const [p, s] of Object.entries(batchStatus)) {
               providerStatus[p] = s.error ? s.error : s.status;
            }
          })
        );

        // Re-process with fallback results included
        deduplicated = deduplicateCandidates(rawCandidates);
        finalDeduplicatedCount = deduplicated.length;

        scored = deduplicated
          .map(({ source, providers }) => ({
            source,
            providers,
            score: scoreCandidate(source, fingerprint),
          }))
          .sort((a, b) => b.score.totalScore - a.score.totalScore);

        topCandidates = scored.slice(0, MAX_CANDIDATES_TO_ANALYZE);
        analyses = topCandidates.map(({ source, providers }) =>
          analyzeCandidate(source, providers, fingerprint, mode)
        );

        finalRanked = rankCandidates(analyses);
      }

      if (isEvidenceSufficient(finalRanked, mode)) {
        break; // Stop progressive relaxation
      }
    }

    // Map the deterministic fit labels to Evidence Relationships for the UI
    const mapEvidenceRelationship = (fit: string, evidenceLevel: number) => {
      if (is_passage_search) {
        return {
          relationship: 'Related Research',
          conversationalText: 'This source is relevant to themes in the selected passage.'
        };
      }

      // If we only have metadata (level 0), it can never be more than Related Research
      if (evidenceLevel === 0) {
        return {
          relationship: 'Related Research',
          conversationalText: 'This source is related to your topic, but the available evidence does not establish support for the specific claim.'
        };
      }

      switch (fit) {
        case 'likely_intended_source':
        case 'possible_supporting_source':
          return {
            relationship: 'Potential Support',
            conversationalText: 'The available abstract discusses several concepts in your claim. Check the source to confirm whether it supports the statement as written.'
          };
        case 'related_research':
        default:
          return {
            relationship: 'Related Research',
            conversationalText: 'This source is related to your topic, but the available evidence does not establish support for the specific claim.'
          };
      }
    };

    // 13. Serialize for client
    const candidates = finalRanked.map((c) => {
      const evidenceData = mapEvidenceRelationship(c.fit, c.evidenceLevel);
      const computedRelevance = calculateRelevance(c.source, scope.candidateClaimText);
      const access = extractAccess(c.source);
      
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
          access: { status: access.status, pdf_url: access.pdf_url },
          identity: { status: c.evidenceLevel >= 1 ? 'confirmed' : 'partial', reasons: [] },
          relevance: computedRelevance,
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
      claimId: persistedClaimId
    });
  } catch (err: any) {
    console.error('[evidence search] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
