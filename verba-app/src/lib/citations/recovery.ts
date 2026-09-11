/**
 * recovery.ts — Citation Recovery Engine
 *
 * H2E: Claim-level recovery for mismatched citations.
 *
 * Provides:
 *  - Recovery mode classification (intended_source | supporting_research | better_source)
 *  - Study fingerprint extraction (institution, population, sample, instruments, etc.)
 *  - Multi-stage scholarly query generation
 *  - Candidate scoring against the claim fingerprint
 *
 * All logic is deterministic. No AI is invoked here.
 * Provider calls happen in the API route — not in this module.
 */

import { NormalizedSource } from '../sources/types';
import { normalizeDoi } from '../sources/normalize';
import { ClaimScope } from './scope';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecoveryMode =
  | 'intended_source'      // Paragraph describes a specific study
  | 'supporting_research'  // General proposition needing supporting evidence
  | 'better_source';       // Uncertain — generic fallback

export type StudyFingerprint = {
  topicTerms: string[];
  institution: string[];
  location: string[];
  population: string[];
  sampleSize: string[];        // e.g. ["150"]
  studyDesign: string[];       // e.g. ["cross-sectional"]
  samplingMethod: string[];    // e.g. ["convenience sampling"]
  instruments: string[];       // e.g. ["WHO-5", "Job Stress Scale"]
  statisticalMethods: string[];// e.g. ["Pearson correlation", "hierarchical regression"]
  intervention: string[];
  outcomes: string[];
  years: string[];
  distinctivePhrases: string[];
};

export type RecoveryQuery = {
  query: string;
  stage: 1 | 2 | 3;  // 1 = high precision, 2 = moderate, 3 = broad
  rationale: string;
};

export type CandidateScore = {
  sourceId: string | null;
  doi: string | null;
  totalScore: number;
  anchorScore: number;       // Score from distinctive anchors (instruments, institution, sample)
  topicScore: number;        // Score from topic/title overlap
  numericalScore: number;    // Score from exact numerical matches
  matchedAnchors: string[];
  missingAnchors: string[];
};

// ─── Known Abbreviations ─────────────────────────────────────────────────────

const ABBREVIATION_EXPANSIONS: Record<string, string[]> = {
  'lumhs': ['liaquat university', 'liaquat university of medical', 'jamshoro'],
  'who-5': ['who-5 well-being', 'who five well-being', 'world health organization five', 'who5'],
  'gad-7': ['generalized anxiety disorder', 'gad7'],
  'phq-9': ['patient health questionnaire', 'phq9'],
  'bdi': ['beck depression inventory'],
  'cbi': ['copenhagen burnout inventory'],
  'mbi': ['maslach burnout inventory'],
  'qol': ['quality of life'],
  'ptsd': ['post-traumatic stress disorder', 'posttraumatic stress'],
  'adhd': ['attention deficit hyperactivity disorder'],
};

function expandAbbreviation(term: string): string[] {
  const lower = term.toLowerCase().trim();
  return ABBREVIATION_EXPANSIONS[lower] || [];
}

// ─── Specific Study Signals ───────────────────────────────────────────────────

const STUDY_DESIGN_PATTERNS = /\b(cross-?sectional|longitudinal|randomized|randomised|cohort|case.?control|quasi.?experimental|systematic review|meta.?analysis|mixed.?methods?|qualitative|quantitative|observational|retrospective|prospective|survey|experimental)\b/gi;

const SAMPLING_PATTERNS = /\b(convenience sampling|purposive sampling|stratified sampling|random sampling|cluster sampling|snowball sampling|purposeful sampling)\b/gi;

const INSTRUMENT_PATTERNS = /\b(WHO-5|PHQ-\d+|GAD-\d+|BDI|CDI|MBI|CBI|GHQ-\d+|SF-\d+|PSS|DASS-?\d*|Likert|Cronbach'?s? alpha|Beck|Hamilton|CAGE|AUDIT|MADRS|SCL-?\d*|COPE|STAI|BAI|MSPSS|SSRS|JSS|JDI|OCQ|MLQ|UWES|OLBI)\b|Job Stress Scale|Social Support Scale|Well.?Being Index|Resilience Scale|Coping Scale|Burnout Scale|Quality of Life Scale/gi;

const STAT_METHOD_PATTERNS = /\b(Pearson'?s? correlation|Spearman'?s? correlation|hierarchical (?:multiple )?regression|multiple regression|logistic regression|linear regression|ANOVA|MANOVA|ANCOVA|t-test|Mann.?Whitney|Wilcoxon|chi.?square|factor analysis|structural equation|SEM|path analysis|cluster analysis|discriminant analysis|Cronbach|reliability analysis|descriptive statistics|inferential statistics|multivariate)\b/gi;

const SAMPLE_SIZE_PATTERNS = /\b(n\s*=\s*\d+|\d+\s*participants?|\d+\s*respondents?|\d+\s*subjects?|\d+\s*employees?|\d+\s*students?|\d+\s*patients?|\d+\s*nurses?|\d+\s*teachers?|\d+\s*workers?|\d+\s*staff)\b/gi;

const INSTITUTION_PATTERNS = /\b([A-Z][A-Za-z]+\s+(?:University|College|Institute|Hospital|Medical Center|School|Academy|Centre|Center)(?:\s+of\s+\w+)*)/g;

const LOCATION_PATTERNS = /\b(Nigeria|Pakistan|India|Bangladesh|Kenya|Ghana|Egypt|China|Iran|Turkey|Malaysia|Indonesia|Ethiopia|South Africa|Tanzania|Uganda|Rwanda|Cameroon|Jamshoro|Karachi|Lahore|Islamabad|Hyderabad|Dhaka|Nairobi|Lagos|Accra|Cairo|Tehran|Ankara|Kuala Lumpur|Jakarta)\b/gi;

const POPULATION_PATTERNS = /\b(nurses?|teachers?|students?|employees?|workers?|academics?|administrative staff|healthcare workers?|physicians?|doctors?|medical staff|university staff|hospital staff|school teachers?|factory workers?|bank employees?|civil servants?|police officers?|military personnel)\b/gi;

// ─── Recovery Mode Classification ─────────────────────────────────────────────

/**
 * Conservative classifier for recovery mode.
 *
 * Counts distinctive methodological signals — if enough are present,
 * it is likely describing a specific study.
 *
 * Signal weights:
 *  - Instrument name (+3): very distinctive
 *  - Explicit sample size (+2): distinctive
 *  - Named institution (+2): distinctive
 *  - Study design (+1)
 *  - Statistical method (+1)
 *  - Named location (+1)
 *  - Population (+1)
 */
export function classifyRecoveryMode(scope: ClaimScope): RecoveryMode {
  const text = scope.candidateClaimText || scope.paragraphContext;
  if (!text) return 'better_source';

  let score = 0;

  const instruments = text.match(INSTRUMENT_PATTERNS);
  if (instruments && instruments.length > 0) score += instruments.length * 3;

  const sampleSizes = text.match(SAMPLE_SIZE_PATTERNS);
  if (sampleSizes && sampleSizes.length > 0) score += 2;

  const institutions = text.match(INSTITUTION_PATTERNS);
  if (institutions && institutions.length > 0) score += 2;

  const designs = text.match(STUDY_DESIGN_PATTERNS);
  if (designs && designs.length > 0) score += 1;

  const stats = text.match(STAT_METHOD_PATTERNS);
  if (stats && stats.length > 0) score += 1;

  const locations = text.match(LOCATION_PATTERNS);
  if (locations && locations.length > 0) score += 1;

  const populations = text.match(POPULATION_PATTERNS);
  if (populations && populations.length > 0) score += 1;

  // High threshold: must have multiple independent signals
  if (score >= 6) return 'intended_source';
  if (score >= 2) return 'better_source';
  return 'supporting_research';
}

// ─── Study Fingerprint Extraction ─────────────────────────────────────────────

export function extractStudyFingerprint(scope: ClaimScope): StudyFingerprint {
  const text = scope.candidateClaimText || scope.paragraphContext;

  const matchAll = (pattern: RegExp, t: string): string[] => {
    const matches: string[] = [];
    const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      const match = m[0].trim();
      if (match && !matches.includes(match)) matches.push(match);
    }
    return matches;
  };

  const institutions = matchAll(INSTITUTION_PATTERNS, text);
  const locations = matchAll(LOCATION_PATTERNS, text);
  const populations = matchAll(POPULATION_PATTERNS, text);
  const studyDesign = matchAll(STUDY_DESIGN_PATTERNS, text);
  const samplingMethod = matchAll(SAMPLING_PATTERNS, text);
  const instruments = matchAll(INSTRUMENT_PATTERNS, text);
  const statisticalMethods = matchAll(STAT_METHOD_PATTERNS, text);

  // Extract numeric sample sizes (just the number)
  const sampleSize: string[] = [];
  const sizeRe = /\b(\d+)\s*(?:participants?|respondents?|subjects?|employees?|students?|patients?|nurses?|teachers?|workers?|staff)\b/gi;
  let sm: RegExpExecArray | null;
  while ((sm = sizeRe.exec(text)) !== null) {
    const n = sm[1];
    if (!sampleSize.includes(n)) sampleSize.push(n);
  }
  // Also look for n = 150 style
  const nEqRe = /\bn\s*=\s*(\d+)\b/gi;
  while ((sm = nEqRe.exec(text)) !== null) {
    const n = sm[1];
    if (!sampleSize.includes(n)) sampleSize.push(n);
  }

  // Extract years
  const years: string[] = [];
  const yearRe = /\b(19\d{2}|20\d{2})\b/g;
  let ym: RegExpExecArray | null;
  while ((ym = yearRe.exec(text)) !== null) {
    if (!years.includes(ym[1])) years.push(ym[1]);
  }

  // Topic terms: meaningful words not in stop list (> 4 chars)
  const STOP_WORDS = new Set(['this','that','with','from','were','have','been','their','they','which','when','also','such','more','than','into','some','those','then','them','these','among','both','each','much','many','well','upon','very','most','only','over','just','even','here','there','through','within','between','while','after','before','however','therefore','although','whether','without','during','about','using','where','study','paper','research','analysis']);
  const topicTerms: string[] = [];
  const words = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/);
  for (const w of words) {
    if (w.length > 4 && !STOP_WORDS.has(w) && !topicTerms.includes(w)) {
      topicTerms.push(w);
    }
    if (topicTerms.length >= 20) break;
  }

  // Distinctive phrases: known compound instrument/test names
  const distinctivePhrases: string[] = [...instruments];

  return {
    topicTerms,
    institution: institutions,
    location: locations,
    population: populations,
    sampleSize,
    studyDesign,
    samplingMethod,
    instruments,
    statisticalMethods,
    intervention: [],
    outcomes: [],
    years,
    distinctivePhrases,
  };
}

// ─── Query Generation ─────────────────────────────────────────────────────────

/**
 * Generates multiple targeted scholarly queries from a study fingerprint.
 * Uses progressive relaxation: Stage 1 = high precision, Stage 3 = broad.
 *
 * NEVER uses the citation text itself (Author, Year) — always uses claim content.
 */
export function generateRecoveryQueries(
  fp: StudyFingerprint,
  mode: RecoveryMode
): RecoveryQuery[] {
  const queries: RecoveryQuery[] = [];

  if (mode === 'intended_source') {
    // Stage 1: Most distinctive anchors combined
    const stage1Parts: string[] = [];

    // Institution is one of the strongest anchors
    if (fp.institution.length > 0) {
      stage1Parts.push(fp.institution[0]);
    }
    // Instruments are highly distinctive
    if (fp.instruments.length > 0) {
      stage1Parts.push(fp.instruments[0]);
    }
    if (fp.instruments.length > 1) {
      stage1Parts.push(fp.instruments[1]);
    }
    // Population narrows significantly
    if (fp.population.length > 0 && stage1Parts.length < 4) {
      stage1Parts.push(fp.population[0]);
    }

    if (stage1Parts.length >= 2) {
      queries.push({
        query: stage1Parts.map(p => `"${p}"`).join(' '),
        stage: 1,
        rationale: 'Distinctive institution and instrument combination',
      });
    }

    // Stage 2: Institution + study design + topic
    const stage2Parts: string[] = [];
    if (fp.institution.length > 0) stage2Parts.push(fp.institution[0]);
    if (fp.location.length > 0 && !stage2Parts.some(p => p.toLowerCase().includes(fp.location[0].toLowerCase()))) {
      stage2Parts.push(fp.location[0]);
    }
    if (fp.population.length > 0) stage2Parts.push(fp.population[0]);
    if (fp.topicTerms.length > 0) stage2Parts.push(fp.topicTerms[0]);
    if (fp.topicTerms.length > 1) stage2Parts.push(fp.topicTerms[1]);

    if (stage2Parts.length >= 2) {
      queries.push({
        query: stage2Parts.join(' '),
        stage: 2,
        rationale: 'Institution, location, and population',
      });
    }

    // Stage 3: Statistical methods + topic (broader)
    const stage3Parts: string[] = [];
    if (fp.studyDesign.length > 0) stage3Parts.push(fp.studyDesign[0]);
    if (fp.statisticalMethods.length > 0) stage3Parts.push(fp.statisticalMethods[0]);
    if (fp.topicTerms.length > 2) stage3Parts.push(...fp.topicTerms.slice(0, 3));

    if (stage3Parts.length >= 2) {
      queries.push({
        query: stage3Parts.join(' '),
        stage: 3,
        rationale: 'Study design and methodology',
      });
    }

    // Extra: if sample size is distinctive, add a query with it
    if (fp.sampleSize.length > 0 && fp.institution.length > 0) {
      queries.push({
        query: `"${fp.sampleSize[0]}" "${fp.institution[0]}" ${fp.topicTerms[0] || ''}`.trim(),
        stage: 2,
        rationale: 'Sample size and institution',
      });
    }

  } else if (mode === 'supporting_research') {
    // Stage 1: core claim terms + population
    const stage1Parts = [...fp.topicTerms.slice(0, 3)];
    if (fp.population.length > 0) stage1Parts.push(fp.population[0]);

    if (stage1Parts.length > 0) {
      queries.push({
        query: stage1Parts.join(' '),
        stage: 1,
        rationale: 'Core claim terms and population',
      });
    }

    // Stage 2: broader topic + location
    const stage2Parts = [...fp.topicTerms.slice(0, 4)];
    if (fp.location.length > 0) stage2Parts.push(fp.location[0]);

    if (stage2Parts.length > 0) {
      queries.push({
        query: stage2Parts.join(' '),
        stage: 2,
        rationale: 'Topic and context',
      });
    }

    // Stage 3: just topic terms
    if (fp.topicTerms.length >= 3) {
      queries.push({
        query: fp.topicTerms.slice(0, 5).join(' '),
        stage: 3,
        rationale: 'Broad topic search',
      });
    }

  } else {
    // better_source — use available signals
    const parts: string[] = [];
    if (fp.institution.length > 0) parts.push(fp.institution[0]);
    if (fp.instruments.length > 0) parts.push(fp.instruments[0]);
    parts.push(...fp.topicTerms.slice(0, 3));

    if (parts.length > 0) {
      queries.push({
        query: parts.slice(0, 4).join(' '),
        stage: 1,
        rationale: 'Available claim signals',
      });
    }

    if (fp.topicTerms.length >= 2) {
      queries.push({
        query: fp.topicTerms.slice(0, 4).join(' '),
        stage: 2,
        rationale: 'Topic terms',
      });
    }
  }

  // Deduplicate queries and enforce max query length
  const seen = new Set<string>();
  return queries
    .filter(q => {
      const key = q.query.trim().toLowerCase().slice(0, 80);
      if (seen.has(key) || q.query.trim().length < 5) return false;
      seen.add(key);
      return true;
    })
    .map(q => ({ ...q, query: q.query.slice(0, 200) }));
}

// ─── Candidate Deduplication ──────────────────────────────────────────────────

type SourceWithProvenance = {
  source: NormalizedSource;
  providers: string[];
};

/**
 * Deduplicates candidate sources from multiple provider/query results.
 * Primary key: normalized DOI.
 * Fallback: normalized title + year.
 * Merges provenance (providers array).
 */
export function deduplicateCandidates(
  candidates: { source: NormalizedSource; provider: string }[]
): SourceWithProvenance[] {
  const byDoi = new Map<string, SourceWithProvenance>();
  const byTitleYear: SourceWithProvenance[] = [];

  for (const { source, provider } of candidates) {
    const doi = normalizeDoi(source.doi);

    if (doi) {
      if (byDoi.has(doi)) {
        const existing = byDoi.get(doi)!;
        if (!existing.providers.includes(provider)) {
          existing.providers.push(provider);
        }
        // Merge abstract if missing
        if (!existing.source.abstract && source.abstract) {
          existing.source = { ...existing.source, abstract: source.abstract };
        }
        // Merge metadata
        existing.source = {
          ...existing.source,
          metadata: { ...source.metadata, ...existing.source.metadata },
        };
      } else {
        byDoi.set(doi, { source: { ...source }, providers: [provider] });
      }
    } else {
      // Title+year fallback
      const titleLower = source.title.toLowerCase().trim().slice(0, 60);
      const year = source.publication_year;
      const found = byTitleYear.find(
        s =>
          s.source.title.toLowerCase().trim().slice(0, 60) === titleLower &&
          s.source.publication_year === year
      );
      if (found) {
        if (!found.providers.includes(provider)) found.providers.push(provider);
        if (!found.source.abstract && source.abstract) {
          found.source = { ...found.source, abstract: source.abstract };
        }
      } else {
        byTitleYear.push({ source: { ...source }, providers: [provider] });
      }
    }
  }

  return [...Array.from(byDoi.values()), ...byTitleYear];
}

// ─── Candidate Scoring ────────────────────────────────────────────────────────

/**
 * Scores a candidate source against the claim fingerprint.
 *
 * Higher score = better match to the claim.
 *
 * Anchor weights:
 *  - Instrument match: 4 points each (very distinctive)
 *  - Institution match: 3 points
 *  - Sample size match: 3 points (exact number)
 *  - Statistical method match: 2 points each
 *  - Study design match: 2 points
 *  - Population match: 2 points
 *  - Location match: 1 point
 *  - Topic term match: 0.5 points each (up to 3)
 */
export function scoreCandidate(
  source: NormalizedSource,
  fp: StudyFingerprint
): CandidateScore {
  // Build a combined searchable text from the candidate
  const candidateText = [
    source.title,
    source.abstract || '',
    source.container_title || '',
    source.publisher || '',
    ((source.metadata?.topics as string[]) || []).join(' '),
  ]
    .join(' ')
    .toLowerCase();

  let anchorScore = 0;
  let topicScore = 0;
  let numericalScore = 0;
  const matchedAnchors: string[] = [];
  const missingAnchors: string[] = [];

  // Helper: check if term (or its abbreviation expansions) appears in text
  const termMatches = (term: string): boolean => {
    const lower = term.toLowerCase();
    if (candidateText.includes(lower)) return true;
    const expansions = expandAbbreviation(lower);
    return expansions.some(e => candidateText.includes(e));
  };

  // Instruments (most distinctive)
  for (const inst of fp.instruments) {
    if (termMatches(inst)) {
      anchorScore += 4;
      matchedAnchors.push(inst);
    } else {
      missingAnchors.push(inst);
    }
  }

  // Institution
  for (const inst of fp.institution) {
    if (termMatches(inst)) {
      anchorScore += 3;
      matchedAnchors.push(inst);
    } else {
      missingAnchors.push(inst);
    }
  }

  // Sample size — exact number only
  for (const size of fp.sampleSize) {
    // Must appear as standalone number, not part of a larger number
    const sizeRe = new RegExp(`\\b${size}\\b`);
    if (sizeRe.test(candidateText)) {
      numericalScore += 3;
      matchedAnchors.push(`${size} participants`);
    }
    // Check if a materially different number is present (flag mismatch)
    // This is handled in candidateMatch.ts
  }

  // Statistical methods
  for (const stat of fp.statisticalMethods) {
    if (termMatches(stat)) {
      anchorScore += 2;
      matchedAnchors.push(stat);
    }
  }

  // Study design
  for (const design of fp.studyDesign) {
    if (termMatches(design)) {
      anchorScore += 2;
      matchedAnchors.push(design);
    } else {
      missingAnchors.push(design);
    }
  }

  // Population
  for (const pop of fp.population) {
    if (termMatches(pop)) {
      anchorScore += 2;
      matchedAnchors.push(pop);
    }
  }

  // Location
  for (const loc of fp.location) {
    if (termMatches(loc)) {
      anchorScore += 1;
      matchedAnchors.push(loc);
    }
  }

  // Topic terms (capped contribution)
  let topicHits = 0;
  for (const term of fp.topicTerms) {
    if (topicHits >= 6) break;
    if (candidateText.includes(term.toLowerCase())) {
      topicScore += 0.5;
      topicHits++;
    }
  }

  const totalScore = anchorScore + numericalScore + Math.min(topicScore, 3);

  return {
    sourceId: source.id || null,
    doi: normalizeDoi(source.doi),
    totalScore,
    anchorScore,
    topicScore,
    numericalScore,
    matchedAnchors: Array.from(new Set(matchedAnchors)),
    missingAnchors: Array.from(new Set(missingAnchors)),
  };
}
