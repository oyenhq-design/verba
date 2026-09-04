-- Migration: Add persistent editor state to public.documents
-- Safe to run multiple times (idempotent). Preserves all existing data.

-- editor_state: The Tiptap JSON document (user's evolving working document)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documents' AND column_name = 'editor_state'
    ) THEN
        ALTER TABLE public.documents ADD COLUMN editor_state JSONB NULL;
        COMMENT ON COLUMN public.documents.editor_state IS
            'Tiptap JSON editor state. NULL means not yet saved; falls back to parsed_content on first open.';
    END IF;
END
$$;

-- editor_updated_at: When the editor state was last successfully saved
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documents' AND column_name = 'editor_updated_at'
    ) THEN
        ALTER TABLE public.documents ADD COLUMN editor_updated_at TIMESTAMPTZ NULL;
        COMMENT ON COLUMN public.documents.editor_updated_at IS
            'Timestamp of last successful editor state save. NULL if never saved.';
    END IF;
END
$$;

-- editor_version: Monotonically increasing version counter for stale-write protection
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documents' AND column_name = 'editor_version'
    ) THEN
        ALTER TABLE public.documents ADD COLUMN editor_version INTEGER NOT NULL DEFAULT 0;
        COMMENT ON COLUMN public.documents.editor_version IS
            'Monotonic save counter. Incremented on every successful editor save. Used for stale-write protection.';
    END IF;
END
$$;
