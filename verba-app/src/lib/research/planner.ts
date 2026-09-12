import { SourceProvider, SourceType } from '../sources/types';

export type ResearchIntent =
  | 'background'
  | 'scholarly_evidence'
  | 'book_reference'
  | 'emerging_research'
  | 'thesis_repository'
  | 'government_regulatory'
  | 'technical_institutional'
  | 'broad_discovery';

export type SourceFamily = 'scholarly' | 'books' | 'preprints' | 'institutional_web';

export type SearchMode = 'ordinary_research' | 'find_evidence';

export interface ResearchPlan {
  originalQuery: string;
  intent: ResearchIntent;
  sourceFamilies: SourceFamily[];
  providers: SourceProvider[];
  primaryProviders: SourceProvider[];
  fallbackProviders: SourceProvider[];
  preferredSourceTypes?: SourceType[];
  recencyPreference: 'none' | 'recent' | 'latest';
  searchMode: SearchMode;
  reasonCodes: string[];
  confidence: 'high' | 'medium' | 'low';
}

const PHRASE_SIGNALS = {
  // book_reference
  'textbook': { intent: 'book_reference', weight: 3, family: 'books' },
  'handbook': { intent: 'book_reference', weight: 3, family: 'books' },
  'monograph': { intent: 'book_reference', weight: 3, family: 'books' },
  'book on': { intent: 'book_reference', weight: 3, family: 'books' },
  'books about': { intent: 'book_reference', weight: 3, family: 'books' },
  'books on': { intent: 'book_reference', weight: 3, family: 'books' },

  // government_regulatory
  'government report': { intent: 'government_regulatory', weight: 3, family: 'institutional_web' },
  'government reports': { intent: 'government_regulatory', weight: 3, family: 'institutional_web' },
  'ministry': { intent: 'government_regulatory', weight: 2, family: 'institutional_web' },
  'regulator': { intent: 'government_regulatory', weight: 2, family: 'institutional_web' },
  'official guideline': { intent: 'government_regulatory', weight: 3, family: 'institutional_web' },

  // thesis_repository
  'phd thesis': { intent: 'thesis_repository', weight: 3, family: 'institutional_web' },
  'doctoral thesis': { intent: 'thesis_repository', weight: 3, family: 'institutional_web' },
  'master thesis': { intent: 'thesis_repository', weight: 3, family: 'institutional_web' },
  'dissertation': { intent: 'thesis_repository', weight: 3, family: 'institutional_web' },
  'institutional repository': { intent: 'thesis_repository', weight: 2, family: 'institutional_web' },

  // scholarly_evidence
  'academic studies': { intent: 'scholarly_evidence', weight: 3, family: 'scholarly' },
  'peer reviewed': { intent: 'scholarly_evidence', weight: 3, family: 'scholarly' },
  'journal articles': { intent: 'scholarly_evidence', weight: 3, family: 'scholarly' },
  'evidence that': { intent: 'scholarly_evidence', weight: 3, family: 'scholarly' },
  'studies on': { intent: 'scholarly_evidence', weight: 2, family: 'scholarly' },
  'relationship between': { intent: 'scholarly_evidence', weight: 2, family: 'scholarly' },
  'experiment': { intent: 'scholarly_evidence', weight: 2, family: 'scholarly' },

  // emerging_research
  'latest research': { intent: 'emerging_research', weight: 3, family: 'scholarly' },
  'latest studies': { intent: 'emerging_research', weight: 3, family: 'scholarly' },
  'recent research': { intent: 'emerging_research', weight: 2, family: 'scholarly' },
  'state of the art': { intent: 'emerging_research', weight: 3, family: 'scholarly' },
  'arxiv': { intent: 'emerging_research', weight: 4, family: 'preprints' },
  'preprint': { intent: 'emerging_research', weight: 4, family: 'preprints' },

  // technical_institutional
  'technical report': { intent: 'technical_institutional', weight: 3, family: 'institutional_web' },
  'white paper': { intent: 'technical_institutional', weight: 3, family: 'institutional_web' },
  'working paper': { intent: 'technical_institutional', weight: 3, family: 'institutional_web' },

  // background
  'what is': { intent: 'background', weight: 2, family: 'books' },
  'introduction to': { intent: 'background', weight: 2, family: 'books' },
  'fundamentals of': { intent: 'background', weight: 2, family: 'books' },
  'basics of': { intent: 'background', weight: 2, family: 'books' },
  'definition of': { intent: 'background', weight: 2, family: 'books' }
} as const;

const AMBIGUOUS_WORDS = [
  'book', 'policy', 'regulation', 'regulatory', 'report', 'standard', 'thesis', 'evidence'
];

// Anti-patterns that negate specific single-word interpretations
const NEGATIVE_PHRASES = [
  'policy gradient', 'regulatory t', 'standard deviation', 'bookkeeping', 'book review', 'book chapter'
];

export function planResearchQuery(originalQuery: string, mode: SearchMode): ResearchPlan {
  const norm = ` ${originalQuery.toLowerCase().replace(/[^\w\s-]/g, ' ')} `;
  
  const scores: Record<ResearchIntent, number> = {
    background: 0,
    scholarly_evidence: 0,
    book_reference: 0,
    emerging_research: 0,
    thesis_repository: 0,
    government_regulatory: 0,
    technical_institutional: 0,
    broad_discovery: 0
  };

  const detectedFamilies = new Set<SourceFamily>();
  const reasonCodes = new Set<string>();
  let recency: 'none' | 'recent' | 'latest' = 'none';

  // 1. Check phrase signals first
  for (const [phrase, config] of Object.entries(PHRASE_SIGNALS)) {
    if (norm.includes(` ${phrase} `)) {
      scores[config.intent] += config.weight;
      detectedFamilies.add(config.family as SourceFamily);
      reasonCodes.add(`PHRASE_${config.intent.toUpperCase()}`);
    }
  }

  // 2. Check unambiguous single words carefully
  const words = norm.trim().split(/\s+/);
  
  // Guard against negative phrases
  const hasNegative = NEGATIVE_PHRASES.some(neg => norm.includes(` ${neg} `));

  if (!hasNegative) {
    if (words.includes('regulation') || words.includes('regulatory') || words.includes('legislation')) {
      scores.government_regulatory += 2;
      detectedFamilies.add('institutional_web');
      reasonCodes.add('WORD_GOVERNMENT');
    }
    
    if (words.includes('policy') && !words.includes('monetary') && !words.includes('fiscal')) {
      scores.government_regulatory += 1;
      detectedFamilies.add('institutional_web');
      reasonCodes.add('WORD_POLICY');
    }

    if (words.includes('book') && !norm.includes('book review') && !norm.includes('book chapter')) {
      scores.book_reference += 1;
      detectedFamilies.add('books');
      reasonCodes.add('WORD_BOOK');
    }

    if (words.includes('thesis')) {
      scores.thesis_repository += 2;
      detectedFamilies.add('institutional_web');
      reasonCodes.add('WORD_THESIS');
    }

    if (words.includes('report') && !words.includes('annual')) {
      // Could be government or technical, score both slightly
      scores.technical_institutional += 1;
      scores.government_regulatory += 1;
      detectedFamilies.add('institutional_web');
      reasonCodes.add('WORD_REPORT');
    }
    
    if (words.includes('evidence') || words.includes('studies')) {
      scores.scholarly_evidence += 1;
      detectedFamilies.add('scholarly');
      reasonCodes.add('WORD_EVIDENCE');
    }
  }

  // 3. Recency checks
  if (norm.includes(' latest ') || norm.includes(' 2026 ') || norm.includes(' 2025 ')) {
    recency = 'latest';
    reasonCodes.add('RECENCY_LATEST');
    if (scores.scholarly_evidence > 0) scores.emerging_research += 2;
  } else if (norm.includes(' recent ') || norm.includes(' current ')) {
    recency = 'recent';
    reasonCodes.add('RECENCY_RECENT');
  }

  // 4. Mode Overrides & Constraints
  if (mode === 'find_evidence') {
    reasonCodes.add('MODE_FIND_EVIDENCE');
    // H4 heavily boosts scholarly
    scores.scholarly_evidence += 3;
    detectedFamilies.add('scholarly');
  }

  // 5. Determine dominant intent
  let dominantIntent: ResearchIntent = 'broad_discovery';
  let maxScore = 0;
  for (const [intent, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      dominantIntent = intent as ResearchIntent;
    }
  }

  // 6. Map to Providers based on collected families and intent
  const primaryProviders = new Set<SourceProvider>();
  const fallbackProviders = new Set<SourceProvider>();
  const familiesArray = Array.from(detectedFamilies);

  if (familiesArray.length === 0) {
    reasonCodes.add('NO_STRONG_INTENT');
    dominantIntent = 'broad_discovery';
    familiesArray.push('scholarly', 'books');
  }

  // Explicit overrides if users specifically asked
  if (norm.includes(' arxiv ') || norm.includes(' preprint ')) {
    primaryProviders.add('arxiv');
    familiesArray.push('preprints');
  }
  
  if (norm.includes(' book ') || norm.includes(' textbook ') || norm.includes(' handbook ')) {
     if (!hasNegative) {
       primaryProviders.add('google_books');
       primaryProviders.add('open_library');
     }
  }

  // Build provider sets based on Mode and Families
  if (mode === 'find_evidence') {
    primaryProviders.add('openalex');
    primaryProviders.add('crossref');
    
    // In H4, books and serper are STRICTLY fallbacks unless explicitly requested
    if (!primaryProviders.has('google_books')) fallbackProviders.add('google_books');
    if (!primaryProviders.has('open_library')) fallbackProviders.add('open_library');
    if (familiesArray.includes('institutional_web')) primaryProviders.add('serper');
    else fallbackProviders.add('serper');
    
  } else {
    // Ordinary research
    if (familiesArray.includes('scholarly')) {
      primaryProviders.add('openalex');
      primaryProviders.add('crossref');
    }
    
    if (familiesArray.includes('books')) {
      primaryProviders.add('google_books');
      primaryProviders.add('open_library');
      fallbackProviders.add('openalex');
      fallbackProviders.add('crossref');
    }
    
    if (familiesArray.includes('preprints')) {
      primaryProviders.add('arxiv');
    }

    if (familiesArray.includes('institutional_web')) {
      primaryProviders.add('serper');
      fallbackProviders.add('openalex');
      fallbackProviders.add('crossref');
    }
    
    // Broad discovery defaults
    if (dominantIntent === 'broad_discovery') {
      primaryProviders.add('openalex');
      primaryProviders.add('crossref');
      primaryProviders.add('google_books');
      primaryProviders.add('open_library');
      fallbackProviders.add('serper');
    }
  }

  // If a provider is in primary, it shouldn't be in fallback
  Array.from(primaryProviders).forEach((p) => {
    fallbackProviders.delete(p);
  });

  const confidence = maxScore >= 3 ? 'high' : (maxScore >= 1 ? 'medium' : 'low');

  return {
    originalQuery,
    intent: dominantIntent,
    sourceFamilies: Array.from(new Set(familiesArray)),
    providers: [...Array.from(primaryProviders), ...Array.from(fallbackProviders)],
    primaryProviders: Array.from(primaryProviders),
    fallbackProviders: Array.from(fallbackProviders),
    recencyPreference: recency,
    searchMode: mode,
    reasonCodes: Array.from(reasonCodes),
    confidence
  };
}
