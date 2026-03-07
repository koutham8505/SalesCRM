-- Phase 3: Notes, Tags, Master Data migration
-- Run this in Supabase SQL Editor

-- 1. Add tags column to my_leads
ALTER TABLE my_leads
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';

-- 2. Lead notes table
CREATE TABLE IF NOT EXISTS lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES my_leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  user_name TEXT,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Templates table (for call scripts, emails, proposal checklists)
CREATE TABLE IF NOT EXISTS lead_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT DEFAULT 'call_script' CHECK (type IN ('call_script','email','proposal_checklist','other')),
  content TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Master data (configurable dropdowns)
CREATE TABLE IF NOT EXISTS master_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category, value)
);

-- 5. Seed master data with default values
INSERT INTO master_data (category, value, sort_order) VALUES
  ('board','CBSE',1),('board','ICSE',2),('board','State',3),
  ('board','IB',4),('board','IGCSE',5),('board','Other',6),
  ('school_type','Individual',1),('school_type','Chain',2),
  ('school_type','Group',3),('school_type','Government',4),
  ('school_type','Trust',5),('school_type','Residential',6),
  ('lead_source','Cold Call',1),('lead_source','Referral',2),
  ('lead_source','LinkedIn',3),('lead_source','Website',4),
  ('lead_source','Email Campaign',5),('lead_source','Walk-in',6),
  ('lead_source','Event',7),('lead_source','Digital Ad',8),('lead_source','Other',9),
  ('tag','High Fee School',1),('tag','CBSE',2),('tag','Urban',3),
  ('tag','Decision Maker Met',4),('tag','Hot Lead',5),('tag','Referral',6)
ON CONFLICT (category, value) DO NOTHING;
