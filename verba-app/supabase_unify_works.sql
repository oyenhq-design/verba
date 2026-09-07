-- 1. Add document_id to works
ALTER TABLE public.works
  ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_works_document_id ON public.works(document_id);

-- 2. RPC: create_blank_work_document
-- Atomically creates a Work and a Document, linking them bidirectionally.
CREATE OR REPLACE FUNCTION create_blank_work_document(
  p_user_id UUID,
  p_title TEXT,
  p_editor_state JSONB,
  p_parsed_content JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_work_id UUID;
  v_document_id UUID;
BEGIN
  -- Create Work
  INSERT INTO public.works (user_id, title, stage, context)
  VALUES (p_user_id, 'Untitled work', 'writing', '{"work_type": "general_document"}'::jsonb)
  RETURNING id INTO v_work_id;

  -- Create Document
  INSERT INTO public.documents (
    user_id, work_id, title, original_filename, status, 
    editor_version, word_count, editor_state, parsed_content
  )
  VALUES (
    p_user_id, v_work_id, p_title, '', 'ready',
    1, 0, p_editor_state, p_parsed_content
  )
  RETURNING id INTO v_document_id;

  -- Bidirectional Link
  UPDATE public.works SET document_id = v_document_id WHERE id = v_work_id;

  RETURN v_document_id;
END;
$$;

-- 3. RPC: adopt_document_into_work
-- Idempotent RPC to safely adopt legacy documents into a new Work.
CREATE OR REPLACE FUNCTION adopt_document_into_work(p_document_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_work_id UUID;
  v_doc_record RECORD;
BEGIN
  -- Fetch document and ensure ownership
  SELECT * INTO v_doc_record FROM public.documents WHERE id = p_document_id AND user_id = p_user_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found or unauthorized';
  END IF;

  -- Idempotency check
  IF v_doc_record.work_id IS NOT NULL THEN
    RETURN v_doc_record.work_id;
  END IF;

  -- Create Work
  INSERT INTO public.works (user_id, title, stage, context, document_id)
  VALUES (p_user_id, COALESCE(v_doc_record.title, 'Untitled work'), 'writing', '{"work_type": "general_document"}'::jsonb, p_document_id)
  RETURNING id INTO v_work_id;

  -- Link Document to Work
  UPDATE public.documents SET work_id = v_work_id WHERE id = p_document_id;

  RETURN v_work_id;
END;
$$;

-- 4. RPC: create_uploaded_work_document
-- Atomically creates a Work and a Document for an uploaded file.
CREATE OR REPLACE FUNCTION create_uploaded_work_document(
  p_document_id UUID,
  p_user_id UUID,
  p_title TEXT,
  p_original_filename TEXT,
  p_mime_type TEXT,
  p_file_size BIGINT,
  p_storage_path TEXT,
  p_parsed_content JSONB,
  p_word_count INT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_work_id UUID;
BEGIN
  -- Create Work
  INSERT INTO public.works (user_id, title, stage, context, document_id)
  VALUES (p_user_id, p_title, 'writing', '{"work_type": "general_document"}'::jsonb, p_document_id)
  RETURNING id INTO v_work_id;

  -- Create Document
  INSERT INTO public.documents (
    id, user_id, work_id, title, original_filename, mime_type, file_size, storage_path, status, 
    editor_version, word_count, parsed_content
  )
  VALUES (
    p_document_id, p_user_id, v_work_id, p_title, p_original_filename, p_mime_type, p_file_size, p_storage_path, 'ready',
    1, p_word_count, p_parsed_content
  );

  RETURN v_work_id;
END;
$$;
