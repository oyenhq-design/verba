import { evaluateCitationIntegrity } from './src/lib/citations/integrity';
import { NormalizedSource } from './src/lib/sources/types';
import { CitationStyle } from './src/lib/citations/formatter';

console.log("=== VERBA CITATION INTEGRITY TESTS ===\n");

const style: CitationStyle = "apa";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const confirmedSource: NormalizedSource = {
  id: "source-1",
  title: "Array programming with NumPy",
  source_type: "journal_article",
  authors: [{ family: "Harris", given: "Charles R." }],
  publication_year: 2020,
  container_title: "Nature",
  publisher: null,
  volume: "585",
  issue: null,
  pages: "357-362",
  doi: "10.1038/s41586-020-2649-2",
  url: null,
  abstract: "NumPy is the fundamental package for array computing...",
  source_provider: "manual",
  metadata: {
    integrity: {
      identity: { status: "confirmed", agreement: ["crossref", "openalex"], reasons: [] },
      evidence_availability: "abstract_available",
      retraction: "none_known",
    }
  }
};

const partialSource: NormalizedSource = {
  ...confirmedSource,
  id: "source-partial",
  metadata: {
    integrity: {
      identity: { status: "partial", agreement: ["crossref"], reasons: [] },
      evidence_availability: "abstract_available",
      retraction: "none_known",
    }
  }
};

const conflictSource: NormalizedSource = {
  ...confirmedSource,
  id: "source-conflict",
  metadata: {
    integrity: {
      identity: { status: "conflict", agreement: [], reasons: [] },
      evidence_availability: "metadata_only",
      retraction: "none_known",
    }
  }
};

const retractedSource: NormalizedSource = {
  ...confirmedSource,
  id: "source-retracted",
  metadata: {
    integrity: {
      identity: { status: "confirmed", agreement: ["crossref"], reasons: [] },
      evidence_availability: "abstract_available",
      retraction: "retracted",
    }
  }
};

const bibWarningSource: NormalizedSource = {
  ...confirmedSource,
  id: "source-bibwarn",
  title: "", // empty title will cause formatter to produce empty output
  metadata: {
    integrity: {
      identity: { status: "confirmed", agreement: ["crossref", "openalex"], reasons: [] },
      evidence_availability: "full_text_location_available",
      retraction: "none_known",
    }
  }
};

const metadataOnlySource: NormalizedSource = {
  ...confirmedSource,
  id: "source-metaonly",
  abstract: null,
  metadata: {
    integrity: {
      identity: { status: "confirmed", agreement: ["crossref", "openalex"], reasons: [] },
      evidence_availability: "metadata_only",
      retraction: "none_known",
    }
  }
};

// ─── Tests ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`✓ ${label}`);
    passed++;
  } else {
    console.log(`✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

// TEST 1: Healthy — all dimensions clean
{
  const r = evaluateCitationIntegrity("cit-1", "source-1", [confirmedSource], style);
  check("1. Healthy citation → overall healthy", r.overall === 'healthy', r.overall);
  check("1b. Healthy → primaryReason is null", r.primaryReason === null);
  check("1c. Healthy → reasons[] is empty", r.reasons.length === 0, `${r.reasons.length} reasons`);
}

// TEST 2: Needs Review — identity partial
{
  const r = evaluateCitationIntegrity("cit-2", "source-partial", [partialSource], style);
  check("2. Identity partial → overall needs_review", r.overall === 'needs_review', r.overall);
  check("2b. Primary reason code is identity_partial", r.primaryReason?.code === 'identity_partial', r.primaryReason?.code);
  check("2c. Claim Support not_checked (still not_checked)", r.claimSupport.status === 'not_checked');
}

// TEST 3: Critical — identity conflict
{
  const r = evaluateCitationIntegrity("cit-3", "source-conflict", [conflictSource], style);
  check("3. Identity conflict → overall critical", r.overall === 'critical', r.overall);
  check("3b. Primary reason code is identity_conflict", r.primaryReason?.code === 'identity_conflict', r.primaryReason?.code);
}

// TEST 4: Critical — retracted source
{
  const r = evaluateCitationIntegrity("cit-4", "source-retracted", [retractedSource], style);
  check("4. Retracted source → overall critical", r.overall === 'critical', r.overall);
  check("4b. Primary reason code is source_retracted", r.primaryReason?.code === 'source_retracted', r.primaryReason?.code);
}

// TEST 5: Critical — missing source
{
  const r = evaluateCitationIntegrity("cit-5", "source-does-not-exist", [confirmedSource], style);
  check("5. Missing source → overall critical", r.overall === 'critical', r.overall);
  check("5b. Primary reason code is source_missing", r.primaryReason?.code === 'source_missing', r.primaryReason?.code);
}

// TEST 6: Needs Review — review-level reason routing
// The formatter only throws (triggering bibliography_warning) in exceptional runtime conditions,
// not from fixture data alone. We verify review-level routing using a partial-identity source.
// A citation with only review-level reasons must produce needs_review, not critical.
{
  const r = evaluateCitationIntegrity("cit-6", "source-partial", [partialSource], style);
  check("6. Review-level reason → needs_review (not critical)", r.overall === 'needs_review', r.overall);
  check("6b. Review reasons all have severity review", r.reasons.every(r => r.severity === 'review'), `${r.reasons.map(r => r.severity).join(',')}`);
  check("6c. No critical reasons present", !r.reasons.some(r => r.severity === 'critical'));
}

// TEST 7: CRITICAL — claim support not_checked must NOT by itself cause needs_review or critical
// This test uses a fully healthy source. Claim support is always 'not_checked' pre-H2.
{
  const r = evaluateCitationIntegrity("cit-7", "source-1", [confirmedSource], style);
  check("7. Claim Support not_checked alone → still Healthy (not needs_review)", r.overall === 'healthy', r.overall);
  check("7b. Claim support status is not_checked", r.claimSupport.status === 'not_checked');
}

// TEST 8: metadata_only evidence alone must NOT trigger needs_review
// Per product spec: evidence availability is informational, not a validity signal.
{
  const r = evaluateCitationIntegrity("cit-8", "source-metaonly", [metadataOnlySource], style);
  check("8. Metadata-only evidence alone → Healthy (not needs_review)", r.overall === 'healthy', r.overall);
  check("8b. Evidence status is metadata_only", r.evidenceAvailability.status === 'metadata_only');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
