import { lookupOpenAlexByDoi } from './src/lib/research/providers/openalex';
async function check() {
  const rawChoice = await lookupOpenAlexByDoi('10.5860/choice.33-1577');
  console.log(JSON.stringify(rawChoice, null, 2));
}
check();
