-- ============================================================
-- VERBA — CLAIM-TO-SOURCE EVIDENCE MAPPING
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================
-- 1. Create claims table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL,
  claim_text TEXT NOT NULL,
  normalized_claim_text TEXT NOT NULL,
  claim_type TEXT NOT NULL DEFAULT 'other'
    CHECK (claim_type IN ('factual', 'causal', 'quantitative', 'comparative', 'methodological', 'interpretive', 'definitional', 'recommendation', 'other')),
  status TEXT NOT NULL DEFAULT 'current'
    CHECK (status IN ('current', 'stale', 'needs_review', 'superseded')),
  content_hash TEXT NOT NULL,
  start_offset INTEGER,
  end_offset INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, block_id, content_hash),
  CHECK (
    (start_offset IS NULL AND end_offset IS NULL)
    OR
    (
      start_offset IS NOT NULL
      AND end_offset IS NOT NULL
      AND start_offset >= 0
      AND end_offset >= start_offset
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_claims_work_id ON public.claims(work_id);
CREATE INDEX IF NOT EXISTS idx_claims_document_id ON public.claims(document_id);
CREATE INDEX IF NOT EXISTS idx_claims_document_block_id ON public.claims(document_id, block_id);

DROP TRIGGER IF EXISTS update_claims_updated_at ON public.claims;
CREATE TRIGGER update_claims_updated_at
BEFORE UPDATE ON public.claims
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for claims
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own claims" ON public.claims;
CREATE POLICY "Users can manage their own claims"
  ON public.claims FOR ALL
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.works w
      WHERE w.id = claims.work_id AND w.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = claims.document_id
        AND d.user_id = auth.uid()
        AND d.work_id = claims.work_id
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.works w
      WHERE w.id = claims.work_id AND w.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = claims.document_id
        AND d.user_id = auth.uid()
        AND d.work_id = claims.work_id
    )
  );

-- ============================================================
-- 2. Create claim_source_evidence table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.claim_source_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES public.work_sources(id) ON DELETE CASCADE,
  citation_id UUID REFERENCES public.document_citations(id) ON DELETE SET NULL, 
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'not_checked' 
    CHECK (relationship IN ('supports', 'partially_supports', 'related', 'contradicts', 'unclear', 'not_checked')),
  evidence_level TEXT NOT NULL DEFAULT 'metadata_only'
    CHECK (evidence_level IN ('metadata_only', 'abstract_checked', 'excerpt_checked', 'full_text_section_checked', 'full_text_checked')),
  evidence_text TEXT,
  evidence_location JSONB,
  evidence_source TEXT
    CHECK (evidence_source IN ('provider_abstract', 'user_supplied_excerpt', 'repository_html', 'publisher_html', 'open_access_content', 'manual') OR evidence_source IS NULL),
  verification_method TEXT NOT NULL DEFAULT 'not_checked'
    CHECK (verification_method IN ('not_checked', 'deterministic_guard', 'manual_review')),
  confidence TEXT
    CHECK (confidence IN ('high', 'medium', 'low') OR confidence IS NULL),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(claim_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_claim_source_evidence_claim_id ON public.claim_source_evidence(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_source_evidence_source_id ON public.claim_source_evidence(source_id);
CREATE INDEX IF NOT EXISTS idx_claim_source_evidence_citation_id ON public.claim_source_evidence(citation_id);

DROP TRIGGER IF EXISTS update_claim_source_evidence_updated_at ON public.claim_source_evidence;
CREATE TRIGGER update_claim_source_evidence_updated_at
BEFORE UPDATE ON public.claim_source_evidence
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for claim_source_evidence
ALTER TABLE public.claim_source_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own evidence mappings" ON public.claim_source_evidence;
CREATE POLICY "Users can manage their own evidence mappings"
  ON public.claim_source_evidence FOR ALL
  USING (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.claims c WHERE c.id = claim_source_evidence.claim_id AND c.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.work_sources ws WHERE ws.id = claim_source_evidence.source_id AND ws.user_id = auth.uid())
    AND (
      -- Same work integrity check
      (SELECT work_id FROM public.claims c WHERE c.id = claim_source_evidence.claim_id) =
      (SELECT work_id FROM public.work_sources ws WHERE ws.id = claim_source_evidence.source_id)
    )
    AND (
      -- Citation integrity check if citation_id is present
      claim_source_evidence.citation_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.document_citations dc
        JOIN public.claims c
          ON c.id = claim_source_evidence.claim_id
        WHERE dc.id = claim_source_evidence.citation_id
          AND dc.document_id = c.document_id
          AND dc.work_source_id = claim_source_evidence.source_id
      )
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.claims c WHERE c.id = claim_source_evidence.claim_id AND c.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.work_sources ws WHERE ws.id = claim_source_evidence.source_id AND ws.user_id = auth.uid())
    AND (
      -- Same work integrity check
      (SELECT work_id FROM public.claims c WHERE c.id = claim_source_evidence.claim_id) =
      (SELECT work_id FROM public.work_sources ws WHERE ws.id = claim_source_evidence.source_id)
    )
    AND (
      -- Citation integrity check if citation_id is present
      claim_source_evidence.citation_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.document_citations dc
        JOIN public.claims c
          ON c.id = claim_source_evidence.claim_id
        WHERE dc.id = claim_source_evidence.citation_id
          AND dc.document_id = c.document_id
          AND dc.work_source_id = claim_source_evidence.source_id
      )
    )
  );

-- Reload Schema
NOTIFY pgrst, 'reload schema';
