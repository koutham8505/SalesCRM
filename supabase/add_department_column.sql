-- ============================================================
-- Add department & tags columns to my_leads
-- Run this in Supabase SQL Editor
-- ============================================================

-- Department column (School / College / Corporate)
ALTER TABLE my_leads
  ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'School'
  CHECK (department IN ('School', 'College', 'Corporate'));

-- Back-fill existing leads as School
UPDATE my_leads SET department = 'School' WHERE department IS NULL;

-- Tags column (array of text labels)
ALTER TABLE my_leads
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Indexes
CREATE INDEX IF NOT EXISTS idx_my_leads_department ON my_leads(department);
