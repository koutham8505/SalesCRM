-- ============================================================
-- Add department column to my_leads
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE my_leads
  ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'School'
  CHECK (department IN ('School', 'College', 'Corporate'));

-- Back-fill existing leads as School (since that's what you had)
UPDATE my_leads SET department = 'School' WHERE department IS NULL;

-- Optional: index for faster filtering
CREATE INDEX IF NOT EXISTS idx_my_leads_department ON my_leads(department);
