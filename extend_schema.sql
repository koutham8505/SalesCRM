-- ============================================================
-- SalesCRM Extension — New Lead Fields & Activity Types
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. New columns on my_leads (School Details & Proposal fields)
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS alt_phone TEXT;
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS proposal_sent BOOLEAN DEFAULT false;
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS proposal_link TEXT;
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS tier TEXT;
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS geo_classification TEXT;
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS board TEXT;
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS fees TEXT;
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS grades_offered TEXT;
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS student_strength INTEGER;
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS medium_of_instruction TEXT;
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS school_type TEXT;
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS last_called_at TIMESTAMPTZ;
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS mail_sent TEXT;
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS pitch_deck_sent TEXT;
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_my_leads_updated_at ON public.my_leads;
CREATE TRIGGER trg_my_leads_updated_at
  BEFORE UPDATE ON public.my_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Update lead_activities type CHECK to include PITCH_DECK
--    Drop existing constraint and re-create with expanded values
ALTER TABLE public.lead_activities DROP CONSTRAINT IF EXISTS lead_activities_type_check;
ALTER TABLE public.lead_activities ADD CONSTRAINT lead_activities_type_check
  CHECK (type IN ('CALL','EMAIL','MEETING','NOTE','PITCH_DECK'));

-- 3. Reload schema cache so PostgREST picks up new columns
NOTIFY pgrst, 'reload schema';
