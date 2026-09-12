export function checkNumericMismatch(claimText: string, evidenceText: string): boolean {
  if (!claimText || !evidenceText) return false;
  
  // Extract percentages, numbers, years
  const numRegex = /\d+(?:\.\d+)?%?/g;
  const claimNums: string[] = claimText.match(numRegex) || [];
  const evidenceNums: string[] = evidenceText.match(numRegex) || [];
  
  // A simple guard: if the claim relies on a number and the evidence doesn't contain that number
  // we flag it as a mismatch to trigger "needs_review" or "unclear", NEVER "supports"
  if (claimNums.length > 0) {
    for (const num of claimNums) {
      if (!evidenceNums.includes(num)) {
        return true; // Mismatch detected
      }
    }
  }
  return false;
}
