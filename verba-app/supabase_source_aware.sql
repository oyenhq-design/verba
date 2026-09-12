-- ============================================================
-- VERBA — SOURCE-AWARE RESEARCH FOUNDATION
-- MIGRATION: Identifiers and Locations
-- ============================================================

-- 1. Create source_identifiers
CREATE TABLE IF NOT EXISTS public.source_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.work_sources(id) ON DELETE CASCADE,
  identifier_type TEXT NOT NULL,
  identifier_value TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_id, identifier_type, normalized_value)
);

CREATE INDEX IF NOT EXISTS idx_source_identifiers_source_id ON public.source_identifiers(source_id);
CREATE INDEX IF NOT EXISTS idx_source_identifiers_normalized_value ON public.source_identifiers(normalized_value);

-- RLS for source_identifiers
ALTER TABLE public.source_identifiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their source_identifiers" ON public.source_identifiers;
CREATE POLICY "Users can manage their source_identifiers"
  ON public.source_identifiers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.work_sources ws
      WHERE ws.id = source_identifiers.source_id
        AND ws.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_sources ws
      WHERE ws.id = source_identifiers.source_id
        AND ws.user_id = auth.uid()
    )
  );

-- 2. Create source_locations
CREATE TABLE IF NOT EXISTS public.source_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.work_sources(id) ON DELETE CASCADE,
  location_type TEXT NOT NULL, 
  url TEXT NOT NULL,
  access_status TEXT NOT NULL DEFAULT 'unknown' CHECK (access_status IN ('open', 'closed', 'unknown')),
  content_type TEXT NOT NULL,
  provider TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_source_locations_source_id ON public.source_locations(source_id);

-- RLS for source_locations
ALTER TABLE public.source_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their source_locations" ON public.source_locations;
CREATE POLICY "Users can manage their source_locations"
  ON public.source_locations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.work_sources ws
      WHERE ws.id = source_locations.source_id
        AND ws.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_sources ws
      WHERE ws.id = source_locations.source_id
        AND ws.user_id = auth.uid()
    )
  );

-- 3. Backfill Existing Data
-- This handles legacy DOIs and URLs in `work_sources`.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, doi, url, source_provider
    FROM public.work_sources
  LOOP
    -- Backfill DOI
    IF rec.doi IS NOT NULL AND BTRIM(rec.doi) != '' THEN
      INSERT INTO public.source_identifiers (
        source_id,
        identifier_type,
        identifier_value,
        normalized_value,
        is_primary
      ) VALUES (
        rec.id,
        'doi',
        BTRIM(rec.doi),
        -- Basic deterministic normalization logic for existing DOIs
        REPLACE(REPLACE(REPLACE(LOWER(BTRIM(rec.doi)), 'https://doi.org/', ''), 'http://dx.doi.org/', ''), 'doi:', ''),
        true
      )
      ON CONFLICT DO NOTHING;
    END IF;

    -- Backfill URL safely (conservative mapping)
    IF rec.url IS NOT NULL AND BTRIM(rec.url) != '' THEN
      INSERT INTO public.source_locations (
        source_id,
        location_type,
        url,
        access_status,
        content_type,
        provider,
        is_primary
      ) VALUES (
        rec.id,
        'source_page',
        BTRIM(rec.url),
        'unknown',
        'landing_page',
        rec.source_provider,
        true
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
