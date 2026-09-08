-- ============================================================
-- VERBA — WORK ↔ DOCUMENT UNIFICATION
-- HARDENED VERSION
--
-- IMPORTANT:
-- Review before deployment.
-- Does not weaken existing RLS.
-- RPC identity is derived from auth.uid().
-- ============================================================


-- ============================================================
-- 1. WORKS.DOCUMENT_ID
-- ============================================================

ALTER TABLE public.works
ADD COLUMN IF NOT EXISTS document_id UUID
REFERENCES public.documents(id)
ON DELETE SET NULL;


CREATE INDEX IF NOT EXISTS idx_works_document_id
ON public.works(document_id);


-- Enforce one Work as the owner of a given primary document.
-- Multiple NULL values remain allowed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_works_document_id_unique
ON public.works(document_id)
WHERE document_id IS NOT NULL;



-- ============================================================
-- 2. CREATE BLANK WORK + DOCUMENT
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_blank_work_document(
    p_title TEXT,
    p_editor_state JSONB,
    p_parsed_content JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_work_id UUID;
    v_document_id UUID;
    v_title TEXT;
BEGIN
    -- Never trust a caller-supplied user_id.
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = '42501';
    END IF;

    v_title := COALESCE(NULLIF(BTRIM(p_title), ''), 'Untitled work');

    -- Create Work first.
    INSERT INTO public.works (
        user_id,
        title,
        stage,
        context
    )
    VALUES (
        v_user_id,
        v_title,
        'writing',
        '{"work_type":"general_document"}'::jsonb
    )
    RETURNING id INTO v_work_id;


    -- Create linked Document.
    INSERT INTO public.documents (
        user_id,
        work_id,
        title,
        original_filename,
        status,
        editor_version,
        word_count,
        editor_state,
        parsed_content
    )
    VALUES (
        v_user_id,
        v_work_id,
        v_title,
        '',
        'ready',
        1,
        0,
        COALESCE(p_editor_state, '{}'::jsonb),
        COALESCE(p_parsed_content, '{}'::jsonb)
    )
    RETURNING id INTO v_document_id;


    -- Complete bidirectional link.
    UPDATE public.works
    SET document_id = v_document_id
    WHERE id = v_work_id
      AND user_id = v_user_id;


    RETURN v_document_id;
END;
$$;



-- ============================================================
-- 3. ADOPT LEGACY DOCUMENT INTO WORK
-- ============================================================

CREATE OR REPLACE FUNCTION public.adopt_document_into_work(
    p_document_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_work_id UUID;
    v_doc RECORD;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = '42501';
    END IF;


    -- Lock the document so concurrent adoption attempts
    -- cannot create duplicate Works.
    SELECT
        id,
        user_id,
        work_id,
        title
    INTO v_doc
    FROM public.documents
    WHERE id = p_document_id
      AND user_id = v_user_id
    FOR UPDATE;


    IF NOT FOUND THEN
        RAISE EXCEPTION 'Document not found or unauthorized'
            USING ERRCODE = '42501';
    END IF;


    -- Already adopted.
    IF v_doc.work_id IS NOT NULL THEN

        -- Repair works.document_id if necessary.
        UPDATE public.works
        SET document_id = p_document_id
        WHERE id = v_doc.work_id
          AND user_id = v_user_id
          AND document_id IS NULL;

        RETURN v_doc.work_id;
    END IF;


    -- Create Work linked to existing Document.
    INSERT INTO public.works (
        user_id,
        title,
        stage,
        context,
        document_id
    )
    VALUES (
        v_user_id,
        COALESCE(NULLIF(BTRIM(v_doc.title), ''), 'Untitled work'),
        'writing',
        '{"work_type":"general_document"}'::jsonb,
        p_document_id
    )
    RETURNING id INTO v_work_id;


    -- Link Document back to Work.
    UPDATE public.documents
    SET work_id = v_work_id
    WHERE id = p_document_id
      AND user_id = v_user_id;


    RETURN v_work_id;
END;
$$;



-- ============================================================
-- 4. CREATE UPLOADED WORK + DOCUMENT
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_uploaded_work_document(
    p_document_id UUID,
    p_title TEXT,
    p_original_filename TEXT,
    p_mime_type TEXT,
    p_file_size BIGINT,
    p_storage_path TEXT,
    p_parsed_content JSONB,
    p_word_count INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_work_id UUID;
    v_title TEXT;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required'
            USING ERRCODE = '42501';
    END IF;


    IF p_document_id IS NULL THEN
        RAISE EXCEPTION 'Document ID is required';
    END IF;


    -- Prevent accidental duplicate document creation.
    IF EXISTS (
        SELECT 1
        FROM public.documents
        WHERE id = p_document_id
    ) THEN
        RAISE EXCEPTION 'Document already exists';
    END IF;


    v_title := COALESCE(NULLIF(BTRIM(p_title), ''), 'Untitled work');


    -- IMPORTANT:
    -- Do NOT set document_id here because the document
    -- does not exist yet.
    INSERT INTO public.works (
        user_id,
        title,
        stage,
        context
    )
    VALUES (
        v_user_id,
        v_title,
        'writing',
        '{"work_type":"general_document"}'::jsonb
    )
    RETURNING id INTO v_work_id;


    -- Now create Document.
    INSERT INTO public.documents (
        id,
        user_id,
        work_id,
        title,
        original_filename,
        mime_type,
        file_size,
        storage_path,
        status,
        editor_version,
        word_count,
        parsed_content
    )
    VALUES (
        p_document_id,
        v_user_id,
        v_work_id,
        v_title,
        COALESCE(p_original_filename, ''),
        p_mime_type,
        p_file_size,
        p_storage_path,
        'ready',
        1,
        GREATEST(COALESCE(p_word_count, 0), 0),
        COALESCE(p_parsed_content, '{}'::jsonb)
    );


    -- Document exists now, so FK is valid.
    UPDATE public.works
    SET document_id = p_document_id
    WHERE id = v_work_id
      AND user_id = v_user_id;


    RETURN v_work_id;
END;
$$;



-- ============================================================
-- 5. RPC PERMISSIONS
-- ============================================================

-- SECURITY DEFINER functions should not remain executable
-- by PUBLIC automatically.

REVOKE ALL ON FUNCTION public.create_blank_work_document(
    TEXT,
    JSONB,
    JSONB
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.adopt_document_into_work(
    UUID
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.create_uploaded_work_document(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    BIGINT,
    TEXT,
    JSONB,
    INTEGER
) FROM PUBLIC;


-- Explicitly prevent anonymous invocation.
REVOKE ALL ON FUNCTION public.create_blank_work_document(
    TEXT,
    JSONB,
    JSONB
) FROM anon;

REVOKE ALL ON FUNCTION public.adopt_document_into_work(
    UUID
) FROM anon;

REVOKE ALL ON FUNCTION public.create_uploaded_work_document(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    BIGINT,
    TEXT,
    JSONB,
    INTEGER
) FROM anon;


-- Authenticated users may execute them.
GRANT EXECUTE ON FUNCTION public.create_blank_work_document(
    TEXT,
    JSONB,
    JSONB
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.adopt_document_into_work(
    UUID
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_uploaded_work_document(
    UUID,
    TEXT,
    TEXT,
    TEXT,
    BIGINT,
    TEXT,
    JSONB,
    INTEGER
) TO authenticated;



-- ============================================================
-- 6. SCHEMA CACHE
-- ============================================================

NOTIFY pgrst, 'reload schema';
