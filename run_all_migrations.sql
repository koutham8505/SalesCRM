-- ============================================================
-- SalesCRM — Run All Pending Migrations
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- This is safe to run multiple times (idempotent)
-- ============================================================

-- ── PART A: extend_schema.sql — New lead fields + PITCH_DECK ──

-- New columns on my_leads
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
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS exported_at TIMESTAMPTZ;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_my_leads_updated_at ON public.my_leads;
CREATE TRIGGER trg_my_leads_updated_at
  BEFORE UPDATE ON public.my_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PITCH_DECK activity type — drop old constraint and re-add with PITCH_DECK included
ALTER TABLE public.lead_activities DROP CONSTRAINT IF EXISTS lead_activities_type_check;
ALTER TABLE public.lead_activities ADD CONSTRAINT lead_activities_type_check
  CHECK (type IN ('CALL','EMAIL','MEETING','NOTE','PITCH_DECK'));

-- ── PART B: phase3_schema.sql — RBAC + Sales Targets ──

-- rbac_permissions table
CREATE TABLE IF NOT EXISTS public.rbac_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission  TEXT NOT NULL,
  granted     BOOLEAN NOT NULL DEFAULT true,
  granted_by  UUID REFERENCES auth.users(id),
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, permission)
);

-- sales_targets table
CREATE TABLE IF NOT EXISTS public.sales_targets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team         TEXT,
  target_type  TEXT NOT NULL DEFAULT 'Monthly'
                CHECK (target_type IN ('Monthly','Quarterly','Yearly')),
  period_label TEXT NOT NULL,
  target_leads INTEGER DEFAULT 0,
  target_won   INTEGER DEFAULT 0,
  target_value NUMERIC DEFAULT 0,
  actual_leads INTEGER DEFAULT 0,
  actual_won   INTEGER DEFAULT 0,
  actual_value NUMERIC DEFAULT 0,
  notes        TEXT,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- rbac_role_defaults table
CREATE TABLE IF NOT EXISTS public.rbac_role_defaults (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role        TEXT NOT NULL,
  permission  TEXT NOT NULL,
  granted     BOOLEAN NOT NULL DEFAULT false,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (role, permission)
);

-- Seed default role permissions
INSERT INTO public.rbac_role_defaults (role, permission, granted) VALUES
  ('Admin',     'import',           true),
  ('Admin',     'bulk_update',      true),
  ('Admin',     'delete',           true),
  ('Admin',     'team_filters',     true),
  ('Admin',     'sensitive_fields', true),
  ('Admin',     'export',           true),
  ('Admin',     'view_reports',     true),
  ('Admin',     'manage_targets',   true),
  ('Manager',   'import',           true),
  ('Manager',   'bulk_update',      true),
  ('Manager',   'delete',           true),
  ('Manager',   'team_filters',     true),
  ('Manager',   'sensitive_fields', true),
  ('Manager',   'export',           true),
  ('Manager',   'view_reports',     true),
  ('Manager',   'manage_targets',   true),
  ('TeamLead',  'import',           true),
  ('TeamLead',  'bulk_update',      true),
  ('TeamLead',  'delete',           false),
  ('TeamLead',  'team_filters',     false),
  ('TeamLead',  'sensitive_fields', false),
  ('TeamLead',  'export',           false),
  ('TeamLead',  'view_reports',     true),
  ('TeamLead',  'manage_targets',   false),
  ('Executive', 'import',           false),
  ('Executive', 'bulk_update',      false),
  ('Executive', 'delete',           false),
  ('Executive', 'team_filters',     false),
  ('Executive', 'sensitive_fields', false),
  ('Executive', 'export',           false),
  ('Executive', 'view_reports',     false),
  ('Executive', 'manage_targets',   false)
ON CONFLICT (role, permission) DO NOTHING;

-- Updated_at triggers for Phase 3 tables
DROP TRIGGER IF EXISTS trg_rbac_permissions_updated_at ON public.rbac_permissions;
CREATE TRIGGER trg_rbac_permissions_updated_at
  BEFORE UPDATE ON public.rbac_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_sales_targets_updated_at ON public.sales_targets;
CREATE TRIGGER trg_sales_targets_updated_at
  BEFORE UPDATE ON public.sales_targets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_rbac_role_defaults_updated_at ON public.rbac_role_defaults;
CREATE TRIGGER trg_rbac_role_defaults_updated_at
  BEFORE UPDATE ON public.rbac_role_defaults
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
