-- ============================================================
-- fix_auth_trigger.sql
-- Run this in Supabase SQL Editor to fix the "Database error
-- creating new user" error.
--
-- This recreates the handle_new_user trigger safely.
-- The trigger auto-creates a profile row when a new Supabase
-- auth user is created.
-- ============================================================

-- Step 1: Drop the trigger if it exists (may be broken)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Drop and recreate the function safely
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only insert if profile doesn't already exist
  INSERT INTO public.profiles (id, full_name, role, team)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Executive'),
    NULLIF(NEW.raw_user_meta_data->>'team', '')
  )
  ON CONFLICT (id) DO NOTHING;  -- safe: won't fail if profile already exists

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log but don't fail the auth user creation
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 3: Re-attach trigger to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Verify profiles table has the required columns
-- (Add team column if it's missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'team'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN team TEXT;
    RAISE NOTICE 'Added team column to profiles';
  END IF;
END $$;
