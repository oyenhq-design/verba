/**
 * candidateMatch.ts — Deterministic Candidate Evidence Comparison
 *
 * H2E-2: Given a scored candidate source and study fingerprint,
 * determines:
 *  - Candidate fit classification (strong_match | possible_match | related_research)
 *  - Matched and unmatched aspects (for "Why this matches" UI)
 *  - Evidence level label (truthful: "Abstract" vs "Metadata only", etc.)
 *  - Numerical anchor analysis (exact match / mismatch)
 *  - Retraction check
 *
 * Does NOT invent claims. Does NOT use AI. Evidence boundary is always declared.
 */

import { NormalizedSource } from '../sources/types';
import { normalizeDoi } from '../sources/normalize';
import { StudyFingerprint, CandidateScore, RecoveryMode, scoreCandidate } from './recovery';
import { classifyEvidenceAvailability, EvidenceLevel, EVIDENCE_LEVEL_LABELS } from './evidence';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CandidateFit = 'likely_intended_source' | 'possible_supporting_source' | 'related_research';

/**
 * Human-readable aspect labels for "Why this matches".
 * These map fingerprint field names to readable display strings.
 */
const ASPECT_LABELS: Record<string, string> = {
  institution: 'Institution',
  location: 'Location',
  population: 'Study population',
  sampleSize: 'Sample size',
  studyDesign: 'Study design',
  samplingMethod: 'Sampling method',
  instruments: 'Measurement instrument',
  statisticalMethods: 'Statistical method',
  intervention: 'Intervention',
  outcomes: 'Outcomes',
  topic: 'Topic relevance',
};

export type EvidenceCheckedLabel =
  | 'Metadata only'
  | 'Abstract'
  | 'Open-access source available'
  | 'Full text analyzed'
  | 'User document';

export type NumericalAnchorResult = {
  claimed: string;
  found: string | null;
  match: boolean;
  mismatch: boolean;
};

export type CandidateAnalysis = {
  source: NormalizedSource;
  providers: string[];

  fit: CandidateFit;
  fitLabel: string;    // "Strong match" | "Possible match" | "Related research"
  fitReason: string;   // Short human-readable reason (for card subtitle)

  /** Aspects confirmed from available evidence */
  matchedAspects: string[];
  /** Aspects present in claim but not confirmed from available evidence */
  unmatchedAspects: string[];

  evidenceLevel: EvidenceLevel;
  /** Truthful display label for what evidence was checked */
  evidenceCheckedLabel: EvidenceCheckedLabel;

  numericalAnchors: NumericalAnchorResult[];

  retracted: boolean;
  doi: string | null;
  /** OA URL for "View Source" button — only if provider-derived */
  sourceUrl: string | null;

  /** Score details (not shown to users, used for ranking) */
  score: CandidateScore;
};

// ─── Evidence Label ───────────────────────────────────────────────────────────

function getEvidenceCheckedLabel(source: NormalizedSource): {
  level: EvidenceLevel;
  label: EvidenceCheckedLabel;
} {
  const ev = classifyEvidenceAvailability(source);

  if (ev.level === 3) return { level: 3, label: 'User document' };
  // Level 2 = OA URL available but NOT fetched/analyzed
  if (ev.level === 2) return { level: 2, label: 'Open-access source available' };
  if (ev.level === 1) return { level: 1, label: 'Abstract' };
  return { level: 0, label: 'Metadata only' };
}

// ─── Numerical Anchor Analysis ────────────────────────────────────────────────

/**
 * For each claimed sample size number, checks whether the candidate's
 * title + abstract confirms the exact number.
 * If a materially different number is found near participant keywords, flags mismatch.
 */
function analyzeNumericalAnchors(
  source: NormalizedSource,
  fp: StudyFingerprint
): NumericalAnchorResult[] {
  const results: NumericalAnchorResult[] = [];
  if (fp.sampleSize.length === 0) return results;

  const candidateText = [source.title, source.abstract || ''].join(' ').toLowerCase();

  for (const claimed of fp.sampleSize) {
    const exactRe = new RegExp(`\\b${claimed}\\b`);
    if (exactRe.test(candidateText)) {
      results.push({ claimed, found: claimed, match: true, mismatch: false });
      continue;
    }

    // Look for a different number near participant keywords (mismatch signal)
    const nearParticipantRe = /\b(\d+)\s*(?:participants?|respondents?|subjects?|employees?|students?)\b/gi;
    let m: RegExpExecArray | null;
    let foundOther: string | null = null;
    while ((m = nearParticipantRe.exec(candidateText)) !== null) {
      if (m[1] !== claimed) {
        foundOther = m[1];
        break;
      }
    }

    if (foundOther) {
      results.push({ claimed, found: foundOther, match: false, mismatch: true });
    } else {
      results.push({ claimed, found: null, match: false, mismatch: false });
    }
  }

  return results;
}

// ─── Aspect Matching ─────────────────────────────────────────────────────────

function getAbbreviationExpansions(term: string): string[] {
  const expansions: Record<string, string[]> = {
    'lumhs': ['liaquat university', 'liaquat university of medical', 'jamshoro'],
    'who-5': ['who-5 well-being', 'who five well-being', 'world health organization five', 'who5'],
    'gad-7': ['generalized anxiety disorder', 'gad7'],
    'phq-9': ['patient health questionnaire', 'phq9'],
    'bdi': ['beck depression inventory'],
    'mbi': ['maslach burnout inventory'],
    'cbi': ['copenhagen burnout inventory'],
  };
  return expansions[term.toLowerCase()] || [];
}

function termInText(term: string, text: string): boolean {
  const lower = term.toLowerCase();
  if (text.includes(lower)) return true;
  const expansions = getAbbreviationExpansions(lower);
  return expansions.some(e => text.includes(e));
}

/**
 * Returns confirmed matched aspects and unmatched aspects as readable labels.
 * Only marks an aspect as "matched" if:
 *  - Evidence level ≥ 1 (abstract available) for specific claims
 *  - OR metadata (title) alone for institution/location/topic
 */
function analyzeAspects(
  source: NormalizedSource,
  fp: StudyFingerprint,
  score: CandidateScore,
  evidenceLevel: EvidenceLevel
): { matched: string[]; unmatched: string[] } {
  const matched: string[] = [];
  const unmatched: string[] = [];

  // Build candidate evidence text depending on level
  const metadataText = [
    source.title,
    source.container_title || '',
    ((source.metadata?.topics as string[]) || []).join(' '),
  ].join(' ').toLowerCase();

  const abstractText = source.abstract ? source.abstract.toLowerCase() : '';
  const fullText = evidenceLevel >= 1
    ? metadataText + ' ' + abstractText
    : metadataText;

  // Institution
  for (const inst of fp.institution) {
    if (termInText(inst, fullText)) {
      matched.push(ASPECT_LABELS.institution);
    } else {
      unmatched.push(ASPECT_LABELS.institution);
    }
    break; // one institution label is enough
  }

  // Location
  for (const loc of fp.location) {
    if (termInText(loc, fullText)) {
      matched.push(ASPECT_LABELS.location);
    }
    break;
  }

  // Population
  for (const pop of fp.population) {
    if (termInText(pop, fullText)) {
      matched.push(ASPECT_LABELS.population);
    } else {
      unmatched.push(ASPECT_LABELS.population);
    }
    break;
  }

  // Study design
  for (const design of fp.studyDesign) {
    if (termInText(design, fullText)) {
      matched.push(ASPECT_LABELS.studyDesign);
    }
    break;
  }

  // Instruments (most distinctive — check each separately)
  for (const inst of fp.instruments) {
    if (termInText(inst, fullText)) {
      matched.push(inst); // Use instrument name directly
    } else {
      unmatched.push(inst);
    }
  }

  // Statistical methods
  const matchedStats = fp.statisticalMethods.filter(m => termInText(m, fullText));
  if (fp.statisticalMethods.length > 0) {
    if (matchedStats.length > 0) {
      matched.push(ASPECT_LABELS.statisticalMethods);
    } else if (evidenceLevel >= 1) {
      // Only flag as unmatched if we had evidence to check
      unmatched.push(ASPECT_LABELS.statisticalMethods);
    }
  }

  // Topic
  if (score.topicScore > 1) {
    matched.push(ASPECT_LABELS.topic);
  }

  // Deduplicate
  return {
    matched: Array.from(new Set(matched)),
    unmatched: Array.from(new Set(unmatched)),
  };
}

// ─── Fit Classification ───────────────────────────────────────────────────────

/**
 * Classifies candidate fit.
 *
 * strong_match:
 *  - Mode = intended_source: ≥3 distinctive anchors matched (score ≥ 10)
 *    AND at least one abstract-based confirmation
 *  - Mode = supporting_research: score ≥ 6 with evidence level ≥ 1
 *
 * possible_match:
 *  - 1-2 distinctive anchors matched, OR topic relevant + metadata
 *
 * related_research:
 *  - Topically relevant but anchors largely missing
 */
function classifyFit(
  score: CandidateScore,
  evidenceLevel: EvidenceLevel,
  mode: RecoveryMode,
  retracted: boolean
): { fit: CandidateFit; reason: string } {
  // Retracted candidates are capped at possible_match with a warning note
  if (retracted) {
    return {
      fit: 'possible_supporting_source',
      reason: 'Source has a retraction warning — not recommended as a replacement.',
    };
  }

  if (mode === 'intended_source') {
    // Strong match requires multiple distinctive anchors AND abstract confirmation
    if (score.anchorScore >= 10 && evidenceLevel >= 1) {
      return {
        fit: 'likely_intended_source',
        reason: 'Multiple distinctive study characteristics confirmed in source evidence.',
      };
    }
    if (score.anchorScore >= 6 || score.totalScore >= 8) {
      return {
        fit: 'possible_supporting_source',
        reason: 'Several characteristics align, but full confirmation requires more evidence.',
      };
    }
    if (score.topicScore >= 1) {
      return {
        fit: 'related_research',
        reason: 'Topically related but does not appear to be the specific study described.',
      };
    }
    return {
      fit: 'related_research',
      reason: 'Limited overlap with the study described.',
    };
  }

  if (mode === 'supporting_research') {
    if (score.totalScore >= 6 && evidenceLevel >= 1) {
      return {
        fit: 'likely_intended_source',
        reason: 'Research directly relevant to your claim with confirmed evidence.',
      };
    }
    if (score.totalScore >= 3) {
      return {
        fit: 'possible_supporting_source',
        reason: 'Relevant research that may support your claim.',
      };
    }
    return {
      fit: 'related_research',
      reason: 'Broadly related to the topic.',
    };
  }

  // better_source mode
  if (score.anchorScore >= 6) return { fit: 'possible_supporting_source', reason: 'Several aspects align.' };
  if (score.topicScore >= 1) return { fit: 'related_research', reason: 'Topically related.' };
  return { fit: 'related_research', reason: 'Broadly related.' };
}

const FIT_LABELS: Record<CandidateFit, string> = {
  likely_intended_source: 'Likely intended source',
  possible_supporting_source: 'Possible supporting source',
  related_research: 'Related research',
};

// ─── Source URL ───────────────────────────────────────────────────────────────

/**
 * Returns the best lawful source URL for "View Source":
 * 1. DOI canonical URL (always valid if DOI present)
 * 2. Provider OA landing page
 * 3. Provider URL field
 */
function getSourceUrl(source: NormalizedSource): string | null {
  const doi = normalizeDoi(source.doi);
  if (doi) return `https://doi.org/${doi}`;

  const oa = source.metadata?.open_access as any;
  if (oa?.oa_url) {
    try {
      const u = new URL(oa.oa_url);
      if (u.protocol === 'http:' || u.protocol === 'https:') return oa.oa_url;
    } catch (_) {}
  }

  if (source.url) {
    try {
      const u = new URL(source.url);
      if (u.protocol === 'http:' || u.protocol === 'https:') return source.url;
    } catch (_) {}
  }

  return null;
}

// ─── Main Analysis Function ───────────────────────────────────────────────────

/**
 * Produces a full CandidateAnalysis for a single source candidate.
 */
export function analyzeCandidate(
  source: NormalizedSource,
  providers: string[],
  fp: StudyFingerprint,
  mode: RecoveryMode
): CandidateAnalysis {
  const score = scoreCandidate(source, fp);
  const { level: evidenceLevel, label: evidenceCheckedLabel } = getEvidenceCheckedLabel(source);
  const retracted = source.metadata?.is_retracted === true;

  const { fit, reason: fitReason } = classifyFit(score, evidenceLevel, mode, retracted);
  const fitLabel = FIT_LABELS[fit];

  const { matched: matchedAspects, unmatched: unmatchedAspects } = analyzeAspects(
    source,
    fp,
    score,
    evidenceLevel
  );

  const numericalAnchors = analyzeNumericalAnchors(source, fp);

  return {
    source,
    providers,
    fit,
    fitLabel,
    fitReason,
    matchedAspects,
    unmatchedAspects,
    evidenceLevel,
    evidenceCheckedLabel,
    numericalAnchors,
    retracted,
    doi: normalizeDoi(source.doi),
    sourceUrl: getSourceUrl(source),
    score,
  };
}

/**
 * Sorts candidates: strong_match first, then possible_match, then related_research.
 * Within same tier, sorted by totalScore descending.
 * Retracted candidates are deprioritized.
 */
export function rankCandidates(candidates: CandidateAnalysis[]): CandidateAnalysis[] {
  const FIT_ORDER: Record<CandidateFit, number> = {
    likely_intended_source: 0,
    possible_supporting_source: 1,
    related_research: 2,
  };

  return [...candidates].sort((a, b) => {
    // Retracted always last
    if (a.retracted && !b.retracted) return 1;
    if (!a.retracted && b.retracted) return -1;

    const fitDiff = FIT_ORDER[a.fit] - FIT_ORDER[b.fit];
    if (fitDiff !== 0) return fitDiff;
    return b.score.totalScore - a.score.totalScore;
  });
}
