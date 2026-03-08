-- ============================================================
-- Add department, team_lead_id columns to profiles table
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add department to user profiles (defaults to School)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'School'
  CHECK (department IN ('School', 'College', 'Corporate'));

-- Add team_lead_id so Executives/TeamLeads can be mapped to a Team Lead
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS team_lead_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Update existing admin/manager users if needed
UPDATE profiles SET department = 'School' WHERE department IS NULL;
