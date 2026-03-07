-- Run this in Supabase SQL Editor to create the announcements table

CREATE TABLE IF NOT EXISTS public.announcements (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    priority    TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
    is_active   BOOLEAN DEFAULT TRUE,
    expires_at  TIMESTAMPTZ,
    created_by  UUID REFERENCES auth.users(id),
    created_by_name TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: everyone can read active announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active announcements"
    ON public.announcements FOR SELECT
    USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Only admins can insert"
    ON public.announcements FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can update"
    ON public.announcements FOR UPDATE
    USING (auth.uid() IS NOT NULL);
