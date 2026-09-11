import { searchOpenAlex } from './src/lib/research/providers/openalex';
import { searchCrossref } from './src/lib/research/providers/crossref';
import { performResearchSearch } from './src/lib/research/search';
import { buildIntegrity } from './src/lib/research/integrity';

async function main() {
  const query = 'gas flaring Nigeria';
  console.log(`Diagnostic for query: "${query}"\n`);
  
  // 1. OpenAlex
  console.log('--- OPENALEX ---');
  const oaRaw = await searchOpenAlex(query);
  console.log(`Raw returned/normalized: ${oaRaw.length}`);
  oaRaw.slice(0, 5).forEach((r, i) => {
    console.log(`${i+1}. ${r.title} (DOI: ${r.doi})`);
  });

  // 2. Crossref
  console.log('\n--- CROSSREF ---');
  const crRaw = await searchCrossref(query);
  console.log(`Raw returned/normalized: ${crRaw.length}`);
  crRaw.slice(0, 5).forEach((r, i) => {
    console.log(`${i+1}. ${r.title} (DOI: ${r.doi})`);
  });

  // 3. Orchestrated Search
  console.log('\n--- ORCHESTRATED ---');
  const searchRes = await performResearchSearch(query);
  console.log(`Total Final Unique: ${searchRes.results.length}`);
  console.log('Top 10 Final Results:');
  searchRes.results.slice(0, 10).forEach((r, i) => {
    console.log(`${i+1}. ${r.source.title}`);
    console.log(`   DOI: ${r.source.doi}`);
    console.log(`   Provenance: ${r.provenance.providers.join(' + ')}`);
    console.log(`   Relevance: ${r.integrity.relevance.status}`);
  });
}

main().catch(console.error);
