-- Migration: Add PROVE architecture (document_versions and document_events)
-- Safe to run multiple times (idempotent). Preserves all existing data.

-- 1. Document Versions
CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    source TEXT NOT NULL,
    editor_state JSONB NOT NULL,
    content_hash TEXT NOT NULL,
    word_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS document_versions_document_id_idx ON public.document_versions(document_id);
CREATE INDEX IF NOT EXISTS document_versions_user_id_idx ON public.document_versions(user_id);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view versions of their documents" ON public.document_versions;
CREATE POLICY "Users can view versions of their documents"
    ON public.document_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE documents.id = document_versions.document_id
            AND documents.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert versions for their documents" ON public.document_versions;
CREATE POLICY "Users can insert versions for their documents"
    ON public.document_versions FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE documents.id = document_id
            AND documents.user_id = auth.uid()
        )
    );


-- 2. Document Events
CREATE TABLE IF NOT EXISTS public.document_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS document_events_document_id_idx ON public.document_events(document_id);
CREATE INDEX IF NOT EXISTS document_events_user_id_idx ON public.document_events(user_id);

ALTER TABLE public.document_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view events of their documents" ON public.document_events;
CREATE POLICY "Users can view events of their documents"
    ON public.document_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE documents.id = document_events.document_id
            AND documents.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert events for their documents" ON public.document_events;
CREATE POLICY "Users can insert events for their documents"
    ON public.document_events FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE documents.id = document_id
            AND documents.user_id = auth.uid()
        )
    );
