-- Phase 1: Lead Workflow Migration
-- Run this in Supabase SQL Editor

-- 1. Add stage pipeline column
ALTER TABLE my_leads
  ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'New';

-- 2. Add lost reason
ALTER TABLE my_leads
  ADD COLUMN IF NOT EXISTS lost_reason TEXT;

-- 3. Add next action fields
ALTER TABLE my_leads
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS next_action_date DATE;

-- 4. Add SLA first contact tracking
ALTER TABLE my_leads
  ADD COLUMN IF NOT EXISTS first_contacted_at TIMESTAMPTZ;

-- 5. Backfill stage from existing status for old records
UPDATE my_leads SET stage = CASE
  WHEN status = 'Won'         THEN 'Won'
  WHEN status = 'Loss'        THEN 'Lost'
  WHEN status = 'In Progress' THEN 'Contacted'
  WHEN status = 'On Hold'     THEN 'Negotiation'
  ELSE 'New'
END
WHERE stage IS NULL OR stage = 'New';
