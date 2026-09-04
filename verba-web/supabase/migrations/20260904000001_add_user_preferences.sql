-- Migration: Add user_preferences table for per-user application settings
-- Safe to run multiple times (idempotent).

CREATE TABLE IF NOT EXISTS public.user_preferences (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    autosave_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_preferences_user_id_unique UNIQUE (user_id)
);

-- Comment columns
COMMENT ON COLUMN public.user_preferences.autosave_enabled IS
    'When true, the editor autosaves ~1s after changes. When false, user must click Save manually.';

-- Row Level Security
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only read their own preferences
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_preferences' AND policyname = 'user_preferences_select_own'
    ) THEN
        CREATE POLICY user_preferences_select_own
            ON public.user_preferences
            FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Users can only insert their own row
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_preferences' AND policyname = 'user_preferences_insert_own'
    ) THEN
        CREATE POLICY user_preferences_insert_own
            ON public.user_preferences
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Users can only update their own row
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_preferences' AND policyname = 'user_preferences_update_own'
    ) THEN
        CREATE POLICY user_preferences_update_own
            ON public.user_preferences
            FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
