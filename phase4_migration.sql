-- Phase 4: Approvals & Notifications
-- Run in Supabase SQL Editor

-- 1. Approvals table
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES my_leads(id) ON DELETE CASCADE,
  lead_name TEXT,
  requested_by UUID REFERENCES profiles(id),
  requested_by_name TEXT,
  request_type TEXT NOT NULL DEFAULT 'discount'
    CHECK (request_type IN ('discount','proposal','custom')),
  description TEXT NOT NULL,
  amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending','Approved','Rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_by_name TEXT,
  reviewer_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'mention',
  title TEXT NOT NULL,
  body TEXT,
  lead_id UUID REFERENCES my_leads(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Internal tasks — add assigned_to so Executives can be assigned tasks from a lead
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;
