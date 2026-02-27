-- ============================================================
-- SalesCRM Phase 3 Schema — RBAC Permissions & Sales Targets
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. rbac_permissions — Fine-grained permission overrides ──
-- Each row grants or denies a specific permission for a user.
-- These override the default role-based permissions.
CREATE TABLE IF NOT EXISTS public.rbac_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission  TEXT NOT NULL,  -- e.g. 'import', 'bulk_update', 'delete', 'view_deals', 'export'
  granted     BOOLEAN NOT NULL DEFAULT true,
  granted_by  UUID REFERENCES auth.users(id),
  reason      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, permission)
);

-- ── 2. sales_targets — Monthly/quarterly targets per user/team ──
CREATE TABLE IF NOT EXISTS public.sales_targets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team         TEXT,
  target_type  TEXT NOT NULL DEFAULT 'Monthly'
                CHECK (target_type IN ('Monthly','Quarterly','Yearly')),
  period_label TEXT NOT NULL,   -- e.g. 'Feb 2026', 'Q1 2026'
  target_leads INTEGER DEFAULT 0,
  target_won   INTEGER DEFAULT 0,
  target_value NUMERIC DEFAULT 0,
  actual_leads INTEGER DEFAULT 0,  -- auto-computed or manually set
  actual_won   INTEGER DEFAULT 0,
  actual_value NUMERIC DEFAULT 0,
  notes        TEXT,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ── 3. rbac_role_defaults — Editable default permissions per role ──
-- Allows admins to change what each role can do by default.
CREATE TABLE IF NOT EXISTS public.rbac_role_defaults (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role        TEXT NOT NULL,       -- 'Admin','Manager','TeamLead','Executive'
  permission  TEXT NOT NULL,       -- same as rbac_permissions.permission
  granted     BOOLEAN NOT NULL DEFAULT false,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (role, permission)
);

-- ── Seed default role permissions ──
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

-- ── 4. Auto-update updated_at triggers ──
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

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

-- ── 5. Add export column to my_leads ──
-- Tracks if a lead has been exported, for audit purposes
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS exported_at TIMESTAMPTZ;

-- ── 6. Row Level Security (optional — enable if needed) ──
-- ALTER TABLE public.rbac_permissions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

-- ── 7. Reload PostgREST schema cache ──
NOTIFY pgrst, 'reload schema';
