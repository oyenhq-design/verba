-- Add analysis_status column if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='analysis_status') THEN
        ALTER TABLE public.documents ADD COLUMN analysis_status TEXT NOT NULL DEFAULT 'not_analyzed';
        
        -- Add constraint
        ALTER TABLE public.documents ADD CONSTRAINT valid_analysis_status CHECK (analysis_status IN ('not_analyzed', 'analyzing', 'analyzed', 'failed'));
    END IF;
END
$$;

-- Add writing_quality_score column if it does not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='writing_quality_score') THEN
        ALTER TABLE public.documents ADD COLUMN writing_quality_score INTEGER NULL;
        
        -- Add constraint
        ALTER TABLE public.documents ADD CONSTRAINT valid_quality_score CHECK (writing_quality_score IS NULL OR (writing_quality_score >= 0 AND writing_quality_score <= 100));
    END IF;
END
$$;
