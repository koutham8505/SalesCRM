-- ============================================================
-- REQUIRED: Add department + team_lead_id to profiles table
-- Run this in: Supabase Dashboard → SQL Editor → New Query → RUN
-- ============================================================

-- Step 1: Add department column (safe if already exists)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'School';

-- Step 2: Add CHECK constraint (only if not already there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_department_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_department_check
      CHECK (department IN ('School', 'College', 'Corporate'));
  END IF;
END $$;

-- Step 3: Add team_lead_id column (self-referential FK — safe if already exists)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS team_lead_id UUID;

-- Add FK constraint only if not already there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_team_lead_id_fkey'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_team_lead_id_fkey
      FOREIGN KEY (team_lead_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 4: Fix all existing NULL department values
UPDATE profiles SET department = 'School' WHERE department IS NULL;

-- Step 5: Verify — you should see all users with their department
SELECT id, full_name, role, department, team_lead_id, is_active
FROM profiles
ORDER BY full_name;
