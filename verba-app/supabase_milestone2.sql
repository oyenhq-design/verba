-- Milestone 2 Database Additions

CREATE TABLE IF NOT EXISTS public.writing_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    block_id TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    original_text TEXT NOT NULL,
    start_offset INTEGER,
    end_offset INTEGER,
    explanation TEXT NOT NULL,
    confidence NUMERIC,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    block_id TEXT NOT NULL,
    issue_id UUID NOT NULL,
    original_text TEXT NOT NULL,
    suggested_text TEXT NOT NULL,
    explanation TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.writing_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on writing_issues for testing" ON public.writing_issues FOR SELECT USING (true);
CREATE POLICY "Allow public insert on writing_issues for testing" ON public.writing_issues FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on writing_issues for testing" ON public.writing_issues FOR UPDATE USING (true);

CREATE POLICY "Allow public select on suggestions for testing" ON public.suggestions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on suggestions for testing" ON public.suggestions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on suggestions for testing" ON public.suggestions FOR UPDATE USING (true);
