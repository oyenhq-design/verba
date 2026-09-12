export function normalizeClaimText(text: string): string {
  if (!text) return '';
  // Unicode normalization, trim whitespace, collapse internal whitespace, preserve numbers/percentages/punctuation
  return text
    .normalize('NFKC')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
