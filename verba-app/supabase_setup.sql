-- 1. Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- References auth.users(id) if auth is enabled
    title TEXT,
    original_filename TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    storage_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploaded',
    word_count INTEGER,
    parsed_content JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policies (Basic policies for development)
-- In production, restrict by user_id
CREATE POLICY "Allow public select for testing" ON public.documents
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert for testing" ON public.documents
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update for testing" ON public.documents
    FOR UPDATE USING (true);

-- 2. Storage Setup
-- You need to create a bucket named 'documents'
-- Ensure it is private (or public for testing purposes depending on your setup)
-- Here are the policies assuming public for testing:

CREATE POLICY "Allow public uploads to documents"
ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow public reads from documents"
ON storage.objects FOR SELECT TO public USING (bucket_id = 'documents');
