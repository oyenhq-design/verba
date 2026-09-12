import { extractClaimScope } from './src/lib/citations/scope';
import { extractStudyFingerprint, classifyRecoveryMode, generateRecoveryQueries, scoreCandidate, deduplicateCandidates } from './src/lib/citations/recovery';
import { analyzeCandidate, rankCandidates } from './src/lib/citations/candidateMatch';
import { searchOpenAlex } from './src/lib/research/providers/openalex';
import { searchCrossref } from './src/lib/research/providers/crossref';
import { calculateRelevance } from './src/lib/research/integrity';

const mapEvidenceRelationship = (fit: string, evidenceLevel: number) => {
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

async function testClaim(claimName: string, claimText: string) {
  console.log(`\n\n==================================================`);
  console.log(`TESTING CLAIM: ${claimName}`);
  console.log(`"${claimText}"`);
  console.log(`==================================================\n`);

  const scope = extractClaimScope('test', null, claimText);
  const mode = classifyRecoveryMode(scope);
  const fp = extractStudyFingerprint(scope);
  const queries = generateRecoveryQueries(fp, mode);

  if (queries.length === 0) {
    console.log("No queries generated.");
    return;
  }

  console.log("Using Query:", queries[0].query);

  const rawCandidates = [];
  try {
    const crossrefRes = await searchCrossref(queries[0].query, 5);
    for (const s of crossrefRes) rawCandidates.push({ source: s, provider: 'crossref' });
  } catch(e) {}
  try {
    const openalexRes = await searchOpenAlex(queries[0].query, 5);
    for (const s of openalexRes) rawCandidates.push({ source: s, provider: 'openalex' });
  } catch(e) {}

  const deduplicated = deduplicateCandidates(rawCandidates);

  const scored = deduplicated
    .map(({ source, providers }) => ({
      source,
      providers,
      score: scoreCandidate(source, fp),
    }))
    .sort((a, b) => b.score.totalScore - a.score.totalScore);

  const topCandidates = scored.slice(0, 3);
  const analyses = topCandidates.map(({ source, providers }) =>
    analyzeCandidate(source, providers, fp, mode)
  );

  const finalRanked = rankCandidates(analyses);

  for (const c of finalRanked) {
    const evidenceData = mapEvidenceRelationship(c.fit, c.evidenceLevel);
    const computedRelevance = calculateRelevance(c.source, scope.candidateClaimText);

    console.log(`\n> Source: ${c.source.title}`);
    console.log(`  DOI: ${c.doi || 'N/A'}`);
    console.log(`  Providers: ${c.providers.join(', ')}`);
    console.log(`  Relevance: ${computedRelevance.status} (${computedRelevance.reasons.join('; ')})`);
    console.log(`  Evidence Checked: ${c.evidenceCheckedLabel}`);
    console.log(`  Evidence Relationship: ${evidenceData.relationship}`);
    console.log(`  Explanation: ${evidenceData.conversationalText}`);
    console.log(`  Fit Details: ${c.fitLabel} (${c.fitReason})`);
  }
}

async function runAll() {
  await testClaim("Original ML Claim", "Machine learning uses artificial neural networks to classify data.");
  await testClaim("Energy", "Gas flaring contributes to greenhouse gas emissions.");
  await testClaim("Cybersecurity", "Machine learning techniques are used for network intrusion detection.");
  await testClaim("Public Health", "Antimicrobial resistance increases the difficulty of treating bacterial infections.");
}

runAll().catch(console.error);
