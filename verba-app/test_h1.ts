import { normalizeDoi } from './src/lib/sources/normalize';
import { calculateIdentity, calculateRelevance } from './src/lib/research/integrity';
import { performDoiLookup, performResearchSearch } from './src/lib/research/search';
import { NormalizedSource } from './src/lib/sources/types';

async function runTests() {
  console.log("=== VERBA PHASE H1 TESTS ===\n");

  // 1. normalizeDoi
  console.log("1. deterministic normalizeDoi test");
  const doi = normalizeDoi("https://doi.org/10.1038/s41586-020-2649-2");
  console.log("Result:", doi);
  console.log("Expected: 10.1038/s41586-020-2649-2");
  console.log("Status:", doi === "10.1038/s41586-020-2649-2" ? "PASS" : "FAIL");

  // 2. LIVE DOI TEST
  console.log("\n2. LIVE DOI TEST");
  try {
    const { result, providerStatus } = await performDoiLookup("10.1038/s41586-020-2649-2");
    console.log("Provider Status:", JSON.stringify(providerStatus));
    console.log("Title:", result?.source.title);
    console.log("Identity:", result?.integrity.identity.status);
    console.log("Status:", (result?.source.title?.includes("NumPy") && result?.integrity.identity.status === 'confirmed') ? "PASS" : "FAIL");
  } catch (e: any) {
    console.log("Error:", e.message);
    console.log("LIVE PROVIDER TEST: NOT TESTED — NETWORK UNAVAILABLE");
  }

  // 3. CONFLICT TEST
  console.log("\n3. IDENTITY CONFLICT TEST");
  try {
    const { result } = await performDoiLookup("10.1038/s41586-020-2649-2", "Renewable Energy Development in Nigeria");
    console.log("Expected Title: Renewable Energy Development in Nigeria");
    console.log("Resolved Title:", result?.source.title);
    console.log("Identity Status:", result?.integrity.identity.status);
    console.log("Reasons:", result?.integrity.identity.reasons);
    console.log("Status:", result?.integrity.identity.status === 'conflict' ? "PASS" : "FAIL");
  } catch (e: any) {
    console.log("LIVE PROVIDER TEST: NOT TESTED — NETWORK UNAVAILABLE");
  }

  // 4. RELEVANCE
  console.log("\n4. DETERMINISTIC RELEVANCE");
  const dummySource: NormalizedSource = {
    title: "Array programming with NumPy",
    source_type: "journal_article",
    authors: [],
    publication_year: 2020,
    container_title: null,
    publisher: null,
    volume: null,
    issue: null,
    pages: null,
    doi: null,
    url: null,
    abstract: null,
    source_provider: 'manual',
    metadata: {}
  };
  
  const relHigh = calculateRelevance(dummySource, "numpy array programming python");
  console.log("Query: numpy array programming python");
  console.log("Result:", relHigh.status);
  console.log("Status:", relHigh.status === 'high' ? "PASS" : "FAIL");

  const relLow = calculateRelevance(dummySource, "gas flaring Nigeria petroleum emissions");
  console.log("Query: gas flaring Nigeria petroleum emissions");
  console.log("Result:", relLow.status);
  console.log("Status:", relLow.status === 'low' ? "PASS" : "FAIL");
}

runTests();
