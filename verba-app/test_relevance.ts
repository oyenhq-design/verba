import { calculateRelevance } from './src/lib/research/integrity';
import { NormalizedSource } from './src/lib/sources/types';

const source: NormalizedSource = {
  source_type: 'journal_article',
  title: 'Thermochemical Conversion of Biomass for Syngas Production: Current Status and Future Trends',
  authors: [],
  publication_year: 2022,
  container_title: 'Sustainability',
  publisher: 'MDPI',
  volume: '14',
  issue: '5',
  pages: '2596',
  doi: '10.3390/su14052596',
  url: 'https://doi.org/10.3390/su14052596',
  abstract: 'Syngas, which consists of carbon monoxide (CO) and hydrogen (H2) and trace amounts of other gases, can be derived from biomass through thermochemical conversion processes... It is a greenhouse gas mitigation strategy.',
  source_provider: 'openalex',
  metadata: {
    topics: ['Thermochemical conversion', 'Biomass', 'Syngas']
  }
};

const query = 'gas flaring Nigeria';

console.log('Query:', query);
console.log('Source Title:', source.title);

const result = calculateRelevance(source, query);
console.log('\nResult:', JSON.stringify(result, null, 2));
