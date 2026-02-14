
-- Add missing columns to insights table
ALTER TABLE public.insights ADD COLUMN IF NOT EXISTS user_relevance text;
ALTER TABLE public.insights ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.insights ADD COLUMN IF NOT EXISTS cluster_name text;
ALTER TABLE public.insights ADD COLUMN IF NOT EXISTS reference_count integer DEFAULT 0;
ALTER TABLE public.insights ADD COLUMN IF NOT EXISTS momentum_score double precision DEFAULT 0;
ALTER TABLE public.insights ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- Add missing columns to signals table
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS nb_impact text;
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS reference_count integer DEFAULT 0;
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;
