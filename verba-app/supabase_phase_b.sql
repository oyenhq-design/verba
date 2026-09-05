-- ═══════════════════════════════════════════════════════════════════════════
-- VERBA CORE — PHASE B MIGRATION (v3 — FINAL)
-- Applied: 2026-09-05
--
-- CHANGES FROM v2:
--   - Idempotency: drops any potentially existing secure policies before creation
--   - Added NOTIFY pgrst, 'reload schema';
--
-- MIGRATION ORDER:
--   1. Drop all permissive legacy testing policies
--   2. Create works table + RLS
--   3. Create work_messages table + RLS
--   4. Add documents.work_id column (FK to works)
--   5. Create new safe documents policies
--   6. Create new safe child-table policies (immutable history)
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- STEP 1 — DROP ALL PERMISSIVE LEGACY POLICIES
-- ───────────────────────────────────────────────────────────────────────────

-- ── documents ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow public select for testing"             ON public.documents;
DROP POLICY IF EXISTS "Allow public insert for testing"             ON public.documents;
DROP POLICY IF EXISTS "Allow public update for testing"             ON public.documents;
DROP POLICY IF EXISTS "Allow public select on documents for testing" ON public.documents;
DROP POLICY IF EXISTS "Allow public insert on documents for testing" ON public.documents;
DROP POLICY IF EXISTS "Allow public update on documents for testing" ON public.documents;

-- ── document_versions ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow public select for testing"                       ON public.document_versions;
DROP POLICY IF EXISTS "Allow public insert for testing"                       ON public.document_versions;
DROP POLICY IF EXISTS "Allow public update for testing"                       ON public.document_versions;
DROP POLICY IF EXISTS "Allow public select on document_versions for testing"  ON public.document_versions;
DROP POLICY IF EXISTS "Allow public insert on document_versions for testing"  ON public.document_versions;
DROP POLICY IF EXISTS "Allow public update on document_versions for testing"  ON public.document_versions;

-- ── document_events ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow public select for testing"                     ON public.document_events;
DROP POLICY IF EXISTS "Allow public insert for testing"                     ON public.document_events;
DROP POLICY IF EXISTS "Allow public update for testing"                     ON public.document_events;
DROP POLICY IF EXISTS "Allow public select on document_events for testing"  ON public.document_events;
DROP POLICY IF EXISTS "Allow public insert on document_events for testing"  ON public.document_events;
DROP POLICY IF EXISTS "Allow public update on document_events for testing"  ON public.document_events;

-- ── writing_issues ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow public select on writing_issues for testing" ON public.writing_issues;
DROP POLICY IF EXISTS "Allow public insert on writing_issues for testing" ON public.writing_issues;
DROP POLICY IF EXISTS "Allow public update on writing_issues for testing" ON public.writing_issues;

-- ── suggestions ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow public select on suggestions for testing" ON public.suggestions;
DROP POLICY IF EXISTS "Allow public insert on suggestions for testing" ON public.suggestions;
DROP POLICY IF EXISTS "Allow public update on suggestions for testing" ON public.suggestions;


-- ───────────────────────────────────────────────────────────────────────────
-- STEP 2 — CREATE works TABLE
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.works (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL DEFAULT 'Untitled work',
  initial_idea TEXT,
  stage        TEXT        NOT NULL DEFAULT 'developing'
               CHECK (stage IN ('developing', 'shaping', 'planning', 'writing', 'reviewing', 'done')),
  context      JSONB       NOT NULL DEFAULT '{
    "working_title": null,
    "work_type": null,
    "field": null,
    "topic": null,
    "problem": null,
    "aim": null,
    "objectives": [],
    "scope": null,
    "methodology": null,
    "tools": [],
    "geography": null,
    "citation_style": null,
    "economic_analysis": null,
    "focus": null,
    "constraints": [],
    "context_summary": null
  }'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own works" ON public.works;
CREATE POLICY "Users can manage their own works"
  ON public.works FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_works_user_id ON public.works(user_id);
CREATE INDEX IF NOT EXISTS idx_works_stage   ON public.works(stage);


-- ───────────────────────────────────────────────────────────────────────────
-- STEP 3 — CREATE work_messages TABLE
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.work_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id    UUID        NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('user', 'verba')),
  content    TEXT        NOT NULL,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.work_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select messages from their works" ON public.work_messages;
CREATE POLICY "Users can select messages from their works"
  ON public.work_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.works w
      WHERE w.id = work_messages.work_id
        AND w.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert messages into their works" ON public.work_messages;
CREATE POLICY "Users can insert messages into their works"
  ON public.work_messages FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.works w
      WHERE w.id = work_messages.work_id
        AND w.user_id = auth.uid()
    )
  );

-- No UPDATE or DELETE policies

CREATE INDEX IF NOT EXISTS idx_work_messages_work_id    ON public.work_messages(work_id);
CREATE INDEX IF NOT EXISTS idx_work_messages_created_at ON public.work_messages(work_id, created_at);


-- ───────────────────────────────────────────────────────────────────────────
-- STEP 4 — ADD documents.work_id
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS work_id UUID REFERENCES public.works(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_work_id ON public.documents(work_id);


-- ───────────────────────────────────────────────────────────────────────────
-- STEP 5 — CREATE documents POLICIES
-- ───────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can select their own documents" ON public.documents;
CREATE POLICY "Users can select their own documents"
  ON public.documents FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
CREATE POLICY "Users can insert their own documents"
  ON public.documents FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      work_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.works w
        WHERE w.id = documents.work_id
          AND w.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
CREATE POLICY "Users can update their own documents"
  ON public.documents FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (
      work_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.works w
        WHERE w.id = documents.work_id
          AND w.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;
CREATE POLICY "Users can delete their own documents"
  ON public.documents FOR DELETE
  USING (user_id = auth.uid());


-- ───────────────────────────────────────────────────────────────────────────
-- STEP 6 — CHILD-TABLE POLICIES
-- ───────────────────────────────────────────────────────────────────────────

-- ── document_versions ──────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can select versions of their documents" ON public.document_versions;
CREATE POLICY "Users can select versions of their documents"
  ON public.document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_versions.document_id
        AND d.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert versions into their documents" ON public.document_versions;
CREATE POLICY "Users can insert versions into their documents"
  ON public.document_versions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_versions.document_id
        AND d.user_id = auth.uid()
    )
  );


-- ── document_events ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can select events for their documents" ON public.document_events;
CREATE POLICY "Users can select events for their documents"
  ON public.document_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_events.document_id
        AND d.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert events into their documents" ON public.document_events;
CREATE POLICY "Users can insert events into their documents"
  ON public.document_events FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_events.document_id
        AND d.user_id = auth.uid()
    )
  );


-- ── writing_issues ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can select writing issues for their documents" ON public.writing_issues;
CREATE POLICY "Users can select writing issues for their documents"
  ON public.writing_issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = writing_issues.document_id
        AND d.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert writing issues for their documents" ON public.writing_issues;
CREATE POLICY "Users can insert writing issues for their documents"
  ON public.writing_issues FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = writing_issues.document_id
        AND d.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update writing issues for their documents" ON public.writing_issues;
CREATE POLICY "Users can update writing issues for their documents"
  ON public.writing_issues FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = writing_issues.document_id
        AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = writing_issues.document_id
        AND d.user_id = auth.uid()
    )
  );


-- ── suggestions ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can select suggestions for their documents" ON public.suggestions;
CREATE POLICY "Users can select suggestions for their documents"
  ON public.suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = suggestions.document_id
        AND d.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert suggestions for their documents" ON public.suggestions;
CREATE POLICY "Users can insert suggestions for their documents"
  ON public.suggestions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = suggestions.document_id
        AND d.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update suggestions for their documents" ON public.suggestions;
CREATE POLICY "Users can update suggestions for their documents"
  ON public.suggestions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = suggestions.document_id
        AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = suggestions.document_id
        AND d.user_id = auth.uid()
    )
  );


-- ───────────────────────────────────────────────────────────────────────────
-- STEP 7 — RELOAD SCHEMA
-- ───────────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF PHASE B MIGRATION (v3 — FINAL)
-- ═══════════════════════════════════════════════════════════════════════════
