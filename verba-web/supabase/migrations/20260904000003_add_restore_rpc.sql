-- ============================================================
-- VERBA PROVE 1C
-- Atomic Safe Version Restore
-- ============================================================

CREATE OR REPLACE FUNCTION public.restore_document_version(
    p_document_id UUID,
    p_version_id UUID,
    p_expected_version INTEGER,
    p_safety_hash TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_doc RECORD;
    v_hist RECORD;
    v_latest_hash TEXT;
    v_new_version INTEGER;
BEGIN

    -- ========================================================
    -- 1. Load and lock the authenticated user's document
    -- ========================================================

    SELECT *
    INTO v_doc
    FROM public.documents
    WHERE id = p_document_id
      AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Document not found or unauthorized'
            USING ERRCODE = 'P0001';
    END IF;


    -- ========================================================
    -- 2. Exact optimistic-concurrency validation
    -- ========================================================

    IF v_doc.editor_version IS DISTINCT FROM p_expected_version THEN
        RAISE EXCEPTION
            'Stale write detected. Expected %, got %',
            p_expected_version,
            v_doc.editor_version
            USING ERRCODE = 'P0002';
    END IF;


    -- ========================================================
    -- 3. Load target historical version
    --
    -- Must belong to:
    --   - same document
    --   - authenticated user
    -- ========================================================

    SELECT *
    INTO v_hist
    FROM public.document_versions
    WHERE id = p_version_id
      AND document_id = p_document_id
      AND user_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Historical version not found'
            USING ERRCODE = 'P0003';
    END IF;


    -- The restore itself creates exactly one new live editor version.
    v_new_version := v_doc.editor_version + 1;


    -- ========================================================
    -- 4. Determine latest historical checkpoint
    --
    -- created_at/id make ordering deterministic if multiple
    -- checkpoints have the same version_number.
    -- ========================================================

    SELECT content_hash
    INTO v_latest_hash
    FROM public.document_versions
    WHERE document_id = p_document_id
    ORDER BY
        version_number DESC,
        created_at DESC,
        id DESC
    LIMIT 1;


    -- ========================================================
    -- 5. Preserve the current working state before restore
    --
    -- Only skip insertion when an identical latest historical
    -- checkpoint already preserves the current state.
    --
    -- IMPORTANT:
    -- version_number represents the CURRENT live state here.
    -- Creating history does not increment editor_version.
    -- ========================================================

    IF v_latest_hash IS DISTINCT FROM p_safety_hash THEN

        INSERT INTO public.document_versions (
            document_id,
            user_id,
            version_number,
            source,
            editor_state,
            content_hash,
            word_count
        )
        VALUES (
            p_document_id,
            auth.uid(),
            v_doc.editor_version,
            'pre_restore_safety',
            v_doc.editor_state,
            p_safety_hash,
            v_doc.word_count
        );

    END IF;


    -- ========================================================
    -- 6. Restore ONLY the editable working state
    --
    -- Do not touch:
    --   parsed_content
    --   original file
    --   storage path
    --   ownership
    --   document created_at
    -- ========================================================

    UPDATE public.documents
    SET
        editor_state = v_hist.editor_state,
        word_count = v_hist.word_count,
        editor_version = v_new_version,
        editor_updated_at = NOW()
    WHERE id = p_document_id;


    -- ========================================================
    -- 7. Record objective provenance
    -- ========================================================

    INSERT INTO public.document_events (
        document_id,
        user_id,
        event_type,
        metadata
    )
    VALUES (
        p_document_id,
        auth.uid(),
        'version_restored',
        jsonb_build_object(
            'restored_version_id',
            v_hist.id,

            'restored_version_number',
            v_hist.version_number,

            'previous_editor_version',
            v_doc.editor_version,

            'new_editor_version',
            v_new_version
        )
    );


    -- ========================================================
    -- 8. Return new live editor version
    -- ========================================================

    RETURN v_new_version;

END;
$$;


-- ============================================================
-- FUNCTION ACCESS
-- ============================================================

REVOKE ALL
ON FUNCTION public.restore_document_version(
    UUID,
    UUID,
    INTEGER,
    TEXT
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.restore_document_version(
    UUID,
    UUID,
    INTEGER,
    TEXT
)
TO authenticated;
