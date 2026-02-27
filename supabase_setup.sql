-- ============================================================
-- SalesCRM Enterprise — Complete Schema
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Profiles table fixes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. my_leads — new columns
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS deal_value NUMERIC;
ALTER TABLE public.my_leads ADD COLUMN IF NOT EXISTS margin NUMERIC;

-- 3. Lead Activities
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL,
  user_id     UUID NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('CALL','EMAIL','MEETING','NOTE','PITCH_DECK')),
  description TEXT,
  duration    INTEGER,
  outcome     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 4. Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  due_date    DATE,
  status      TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','In Progress','Done')),
  lead_id     UUID,
  owner_id    UUID NOT NULL,
  team        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 5. Feature Requests (keep existing)
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_features TEXT NOT NULL,
  reason             TEXT,
  status             TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected')),
  admin_comment      TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- 6. Email Templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Audit Log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID,
  user_email       TEXT,
  action_type      TEXT NOT NULL,
  target_id        TEXT,
  target_table     TEXT,
  payload_snapshot JSONB,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- 8. Validation Rules (admin-configurable)
CREATE TABLE IF NOT EXISTS public.validation_rules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL UNIQUE,
  required   BOOLEAN DEFAULT false,
  regex      TEXT,
  message    TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default validation rules
INSERT INTO public.validation_rules (field_name, required, regex, message) VALUES
  ('lead_name', true, NULL, 'Lead name is required'),
  ('institution_name', true, NULL, 'Institution is required'),
  ('status', true, NULL, 'Status is required'),
  ('email', false, '^[^@]+@[^@]+\.[^@]+$', 'Invalid email format'),
  ('phone', false, '^\+?\d{10,15}$', 'Phone must be 10-15 digits')
ON CONFLICT (field_name) DO NOTHING;

-- 9. Fix trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, team)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Executive'),
    NEW.raw_user_meta_data->>'team'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Reload schema cache
NOTIFY pgrst, 'reload schema';
