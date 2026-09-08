import { evaluateCitationIntegrity } from './src/lib/citations/integrity';
import { NormalizedSource } from './src/lib/sources/types';
import { CitationStyle } from './src/lib/citations/formatter';

console.log("=== VERBA CITATION INTEGRITY TESTS ===\n");

const dummySource: NormalizedSource = {
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
      identity: { status: "confirmed", reasons: [] },
      evidence_availability: "abstract_available",
      relevance: { status: "high", reasons: [] },
      access: { status: "unknown", landing_page_url: null, pdf_url: null },
      retraction: "none_known"
    }
  }
};

const dummySources = [dummySource];
const style: CitationStyle = "apa";

// 1. Valid Citation
const res1 = evaluateCitationIntegrity("cit-1", "source-1", dummySources, style);
console.log("1. Valid Citation =>", res1.overall === 'healthy' ? "PASS" : `FAIL (${res1.overall})`);

// 2. Missing Source (Row exists, source missing)
const res2 = evaluateCitationIntegrity("cit-2", "source-missing", dummySources, style);
console.log("2. Missing Source =>", res2.overall === 'critical' ? "PASS" : `FAIL (${res2.overall})`);

// 3. Identity Conflict
const conflictSource: NormalizedSource = {
  ...dummySource,
  id: "source-3",
  metadata: {
    integrity: {
      identity: { status: "conflict" },
      evidence_availability: "metadata_only",
    }
  }
};
const res3 = evaluateCitationIntegrity("cit-3", "source-3", [conflictSource], style);
console.log("3. Identity Conflict =>", res3.overall === 'critical' ? "PASS" : `FAIL (${res3.overall})`);

// 4. Retracted Source
const retractedSource = { ...dummySource, id: "source-4", metadata: { ...dummySource.metadata, is_retracted: true } };
const res4 = evaluateCitationIntegrity("cit-4", "source-4", [retractedSource], style);
console.log("4. Retracted Source =>", res4.overall === 'critical' ? "PASS" : `FAIL (${res4.overall})`);

// 5. Evidence Availability mapping
console.log("5. Evidence availability mapped correctly =>", res1.evidenceAvailability.status === 'abstract_available' ? "PASS" : `FAIL (${res1.evidenceAvailability.status})`);
console.log("6. Claim support not checked =>", res1.claimSupport.status === 'not_checked' ? "PASS" : `FAIL (${res1.claimSupport.status})`);
