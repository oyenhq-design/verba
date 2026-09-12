import { extractClaimScope } from './src/lib/citations/scope';
import { extractStudyFingerprint, classifyRecoveryMode, generateRecoveryQueries, scoreCandidate } from './src/lib/citations/recovery';
import { analyzeCandidate, rankCandidates } from './src/lib/citations/candidateMatch';
import { searchOpenAlex } from './src/lib/research/providers/openalex';

async function runDiag() {
  const claimText = "Machine learning uses artificial neural networks to classify data.";
  
  // 1. Scope
  const scope = extractClaimScope('test-id', null, claimText);
  console.log("=== 1. CLAIM SCOPE ===");
  console.log(JSON.stringify(scope, null, 2));

  // 2. Mode & Fingerprint
  const mode = classifyRecoveryMode(scope);
  const fp = extractStudyFingerprint(scope);
  console.log("\n=== 2. RECOVERY MODE & FINGERPRINT ===");
  console.log("Mode:", mode);
  console.log("Fingerprint:", JSON.stringify(fp, null, 2));

  // 3. Queries
  const queries = generateRecoveryQueries(fp, mode);
  console.log("\n=== 3. GENERATED QUERIES ===");
  console.log(JSON.stringify(queries, null, 2));

  // Let's manually fetch the DOI 10.5860/choice.33-1577 to see what it is
  try {
    const rawChoice = await searchOpenAlex('10.5860/choice.33-1577');
    console.log("\n=== 4. CHOICE REVIEW METADATA ===");
    console.log(JSON.stringify(rawChoice, null, 2));
  } catch (e) {
    console.log("Failed to fetch Choice Review:", e);
  }

  // Let's also do a quick run against one query to see results
  if (queries.length > 0) {
    const searchRes = await searchOpenAlex(queries[0].query);
    console.log(`\n=== 5. RESULTS FOR QUERY: ${queries[0].query} ===`);
    console.log(`Found ${searchRes.length} results.`);
    const top = searchRes.slice(0, 3);
    for (const source of top) {
      const score = scoreCandidate(source, fp);
      const analysis = analyzeCandidate(source, ['openalex'], fp, mode);
      console.log(`\n- Title: ${source.title}`);
      console.log(`  DOI: ${source.doi}`);
      console.log(`  Total Score: ${score.totalScore}`);
      console.log(`  Fit: ${analysis.fitLabel} (${analysis.fit})`);
      console.log(`  Reason: ${analysis.fitReason}`);
      console.log(`  Matched aspects:`, analysis.matchedAspects);
      console.log(`  Evidence Level: ${analysis.evidenceCheckedLabel}`);
    }
  }
}

runDiag().catch(console.error);
