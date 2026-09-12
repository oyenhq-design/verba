import { normalizeClaimText } from './src/lib/evidence/normalize';
import { checkNumericMismatch } from './src/lib/evidence/numeric';
import { determineDeterministicRelationship } from './src/lib/evidence/relationships';

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assertEqual(actual: any, expected: any, msg: string) {
    if (actual === expected) {
      passed++;
      console.log(`[PASS] ${msg}`);
    } else {
      failed++;
      console.error(`[FAIL] ${msg} | Expected ${expected}, got ${actual}`);
    }
  }

  console.log('--- Running Evidence Mapping Tests ---');

  // Test Normalization
  assertEqual(normalizeClaimText('  Hello \n\nWorld 42%   '), 'Hello World 42%', 'Claim normalization trims and collapses whitespace');
  assertEqual(normalizeClaimText(''), '', 'Empty string returns empty string');

  // Test Numeric Guard
  assertEqual(checkNumericMismatch('Emissions decreased by 24%', 'It decreased by 24%'), false, 'Numeric match allows pass');
  assertEqual(checkNumericMismatch('Emissions decreased by 24%', 'It decreased by 42%'), true, 'Numeric mismatch correctly flagged');
  assertEqual(checkNumericMismatch('The sky is blue', 'The sky is indeed blue'), false, 'No numbers returns false (no mismatch)');
  
  // Test Relationships
  const rel1 = determineDeterministicRelationship('This is a claim', null);
  assertEqual(rel1.relationship, 'not_checked', 'Null evidence returns not_checked');
  
  const rel2 = determineDeterministicRelationship('Increase of 24%', 'Increase of 42%');
  assertEqual(rel2.relationship, 'unclear', 'Numeric mismatch yields unclear relationship');
  assertEqual(rel2.method, 'deterministic_guard', 'Numeric mismatch uses deterministic guard method');

  const rel3 = determineDeterministicRelationship('Artificial intelligence transforms modern society', 'AI transforms modern society and other things');
  assertEqual(rel3.relationship, 'related', 'High lexical overlap yields related (not supports)');

  console.log('------------------------------------');
  console.log(`Tests complete: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
