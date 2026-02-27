-- ============================================================
-- fix_my_leads_constraints.sql
-- Run this in Supabase SQL Editor to fix "Save Failed"
-- (null value in column violates not-null constraint)
--
-- Makes optional lead columns nullable so they can be left empty.
-- ============================================================

ALTER TABLE public.my_leads
  ALTER COLUMN email      DROP NOT NULL,
  ALTER COLUMN phone      DROP NOT NULL,
  ALTER COLUMN website    DROP NOT NULL,
  ALTER COLUMN whatsapp   DROP NOT NULL,
  ALTER COLUMN alt_phone  DROP NOT NULL,
  ALTER COLUMN remark     DROP NOT NULL,
  ALTER COLUMN lead_source DROP NOT NULL,
  ALTER COLUMN lead_owner  DROP NOT NULL,
  ALTER COLUMN next_follow_up DROP NOT NULL,
  ALTER COLUMN meeting_date   DROP NOT NULL;

-- Verify the constraint change
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'my_leads'
  AND column_name IN ('email','phone','website','whatsapp','remark','lead_source')
ORDER BY column_name;
