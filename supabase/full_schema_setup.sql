
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer');
CREATE TYPE public.event_status AS ENUM ('draft', 'live', 'past');
CREATE TYPE public.registration_status AS ENUM ('registered', 'checked_in', 'cancelled');
CREATE TYPE public.email_template_type AS ENUM ('confirmation', 'reminder', 'followup');

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User roles (separate table per security best practices)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  event_date TIMESTAMPTZ,
  event_type TEXT DEFAULT 'webinar',
  status event_status NOT NULL DEFAULT 'draft',
  template TEXT DEFAULT 'minimal',
  primary_color TEXT DEFAULT '#7C3AED',
  logo_url TEXT,
  background_image_url TEXT,
  registration_limit INT,
  registration_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own events" ON public.events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own events" ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON public.events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON public.events FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Public can view live events by slug" ON public.events FOR SELECT USING (status = 'live');
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_events_slug ON public.events (slug);
CREATE INDEX idx_events_user_id ON public.events (user_id);

-- Form fields
CREATE TABLE public.form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  placeholder TEXT,
  required BOOLEAN NOT NULL DEFAULT true,
  position INT NOT NULL DEFAULT 0
);
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage form fields via event ownership" ON public.form_fields FOR ALL USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = form_fields.event_id AND events.user_id = auth.uid())
);
CREATE POLICY "Public can view form fields for live events" ON public.form_fields FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = form_fields.event_id AND events.status = 'live')
);
CREATE INDEX idx_form_fields_event_id ON public.form_fields (event_id);

-- Registrations
CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  status registration_status NOT NULL DEFAULT 'registered',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Event owners can view registrations" ON public.registrations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = registrations.event_id AND events.user_id = auth.uid())
);
CREATE POLICY "Anyone can register for live events" ON public.registrations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = registrations.event_id AND events.status = 'live')
);
CREATE POLICY "Event owners can update registrations" ON public.registrations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = registrations.event_id AND events.user_id = auth.uid())
);
CREATE INDEX idx_registrations_event_id ON public.registrations (event_id);

-- Email templates
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  template_type email_template_type NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (event_id, template_type)
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage email templates via event ownership" ON public.email_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = email_templates.event_id AND events.user_id = auth.uid())
);

-- Storage bucket for event assets
INSERT INTO storage.buckets (id, name, public) VALUES ('event-assets', 'event-assets', true);
CREATE POLICY "Anyone can view event assets" ON storage.objects FOR SELECT USING (bucket_id = 'event-assets');
CREATE POLICY "Authenticated users can upload event assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'event-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own event assets" ON storage.objects FOR UPDATE USING (bucket_id = 'event-assets' AND auth.role() = 'authenticated');

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS location_type text,
  ADD COLUMN IF NOT EXISTS location_value text,
  ADD COLUMN IF NOT EXISTS ticket_price numeric,
  ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS capacity integer;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.events ADD COLUMN color_mode text DEFAULT 'light';-- Allow anonymous users to register for live events
CREATE POLICY "Anonymous can register for live events"
ON public.registrations
FOR INSERT TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = registrations.event_id
    AND events.status = 'live'::event_status
  )
);-- Drop the two broken restrictive INSERT policies
DROP POLICY IF EXISTS "Anonymous can register for live events" ON public.registrations;
DROP POLICY IF EXISTS "Anyone can register for live events" ON public.registrations;

-- Create a single PERMISSIVE INSERT policy for anon and authenticated
CREATE POLICY "Allow registration for live events"
ON public.registrations
FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = registrations.event_id
    AND events.status = 'live'::event_status
  )
);
-- EVENTS: drop all restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Users can view own events" ON public.events;
DROP POLICY IF EXISTS "Users can create own events" ON public.events;
DROP POLICY IF EXISTS "Users can update own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete own events" ON public.events;
DROP POLICY IF EXISTS "Public can view live events by slug" ON public.events;
DROP POLICY IF EXISTS "Public can view live events" ON public.events;

CREATE POLICY "Users can view own events" ON public.events AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own events" ON public.events AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON public.events AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON public.events AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Public can view live events" ON public.events AS PERMISSIVE FOR SELECT TO anon, authenticated USING (status = 'live'::event_status);

-- REGISTRATIONS: drop all restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Allow registration for live events" ON public.registrations;
DROP POLICY IF EXISTS "Event owners can view registrations" ON public.registrations;
DROP POLICY IF EXISTS "Event owners can update registrations" ON public.registrations;

CREATE POLICY "Allow registration for live events" ON public.registrations AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = registrations.event_id AND events.status = 'live'::event_status));
CREATE POLICY "Event owners can view registrations" ON public.registrations AS PERMISSIVE FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = registrations.event_id AND events.user_id = auth.uid()));
CREATE POLICY "Event owners can update registrations" ON public.registrations AS PERMISSIVE FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = registrations.event_id AND events.user_id = auth.uid()));

-- FORM_FIELDS: drop all restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Public can view form fields for live events" ON public.form_fields;
DROP POLICY IF EXISTS "Users can manage form fields via event ownership" ON public.form_fields;

CREATE POLICY "Public can view form fields for live events" ON public.form_fields AS PERMISSIVE FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = form_fields.event_id AND events.status = 'live'::event_status));
CREATE POLICY "Users can manage form fields via event ownership" ON public.form_fields AS PERMISSIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = form_fields.event_id AND events.user_id = auth.uid()));

-- PROFILES: drop all restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- USER_ROLES: drop restrictive and recreate as permissive
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- EMAIL_TEMPLATES: drop restrictive and recreate as permissive
DROP POLICY IF EXISTS "Users can manage email templates via event ownership" ON public.email_templates;
CREATE POLICY "Users can manage email templates via event ownership" ON public.email_templates AS PERMISSIVE FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM events WHERE events.id = email_templates.event_id AND events.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.register_for_event(
  p_event_id uuid,
  p_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM events WHERE id = p_event_id AND status = 'live'::event_status
  ) THEN
    RAISE EXCEPTION 'Event not found or not accepting registrations';
  END IF;

  INSERT INTO registrations (event_id, data)
  VALUES (p_event_id, p_data)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_description text,
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '[]'::jsonb;
-- Add company_slug column to profiles
ALTER TABLE public.profiles ADD COLUMN company_slug text UNIQUE;

-- Create a public read-only view for company profiles (excludes private data)
-- Instead of exposing all profile fields, we add a selective public RLS policy
CREATE POLICY "Public can view company profiles by slug"
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (company_slug IS NOT NULL);

-- Allow public to count registrations for live events (needed for attendee counts on public company page)
CREATE POLICY "Public can view registration counts for live events"
  ON public.registrations
  FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM events WHERE events.id = registrations.event_id AND events.status = 'live'::event_status
  ));
UPDATE profiles SET company_slug = 'ezdisplay-ai' WHERE id = 'ce75d3c2-9fe5-449b-9213-c49e48965746' AND company_slug IS NULL;
-- Harden register_for_event: add capacity, deadline, and registration_limit checks
CREATE OR REPLACE FUNCTION public.register_for_event(p_event_id uuid, p_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_event record;
  v_current_count integer;
BEGIN
  -- Fetch event details with lock to prevent race conditions
  SELECT id, status, capacity, registration_limit, registration_deadline
  INTO v_event
  FROM events
  WHERE id = p_event_id AND status = 'live'::event_status
  FOR UPDATE;

  IF v_event IS NULL THEN
    RAISE EXCEPTION 'Event not found or not accepting registrations';
  END IF;

  -- Check registration deadline
  IF v_event.registration_deadline IS NOT NULL AND now() > v_event.registration_deadline THEN
    RAISE EXCEPTION 'Registration deadline has passed';
  END IF;

  -- Get current registration count
  SELECT count(*) INTO v_current_count
  FROM registrations
  WHERE event_id = p_event_id AND status != 'cancelled'::registration_status;

  -- Check capacity
  IF v_event.capacity IS NOT NULL AND v_current_count >= v_event.capacity THEN
    RAISE EXCEPTION 'Event is at full capacity';
  END IF;

  -- Check registration limit
  IF v_event.registration_limit IS NOT NULL AND v_current_count >= v_event.registration_limit THEN
    RAISE EXCEPTION 'Registration limit reached';
  END IF;

  -- Validate required data field is not empty
  IF p_data IS NULL OR p_data = '{}'::jsonb THEN
    RAISE EXCEPTION 'Registration data is required';
  END IF;

  INSERT INTO registrations (event_id, data)
  VALUES (p_event_id, p_data)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- Remove the overly permissive public SELECT policy
DROP POLICY "Public can view registration counts for live events" ON public.registrations;

-- Create a secure function for public registration counts (no PII exposed)
CREATE OR REPLACE FUNCTION public.get_registration_count(p_event_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM registrations
  WHERE event_id = p_event_id
    AND status != 'cancelled'::registration_status
$$;

CREATE OR REPLACE FUNCTION public.register_for_event(p_event_id uuid, p_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_event record;
  v_current_count integer;
  v_email text;
  v_email_count integer;
BEGIN
  -- Fetch event details with lock to prevent race conditions
  SELECT id, status, capacity, registration_limit, registration_deadline
  INTO v_event
  FROM events
  WHERE id = p_event_id AND status = 'live'::event_status
  FOR UPDATE;

  IF v_event IS NULL THEN
    RAISE EXCEPTION 'Event not found or not accepting registrations';
  END IF;

  -- Check registration deadline
  IF v_event.registration_deadline IS NOT NULL AND now() > v_event.registration_deadline THEN
    RAISE EXCEPTION 'Registration deadline has passed';
  END IF;

  -- Get current registration count
  SELECT count(*) INTO v_current_count
  FROM registrations
  WHERE event_id = p_event_id AND status != 'cancelled'::registration_status;

  -- Check capacity
  IF v_event.capacity IS NOT NULL AND v_current_count >= v_event.capacity THEN
    RAISE EXCEPTION 'Event is at full capacity';
  END IF;

  -- Check registration limit
  IF v_event.registration_limit IS NOT NULL AND v_current_count >= v_event.registration_limit THEN
    RAISE EXCEPTION 'Registration limit reached';
  END IF;

  -- Validate required data field is not empty
  IF p_data IS NULL OR p_data = '{}'::jsonb THEN
    RAISE EXCEPTION 'Registration data is required';
  END IF;

  -- Payload size guard (max 4KB)
  IF octet_length(p_data::text) > 4096 THEN
    RAISE EXCEPTION 'Registration data too large';
  END IF;

  -- Duplicate prevention: extract email (case-insensitive) and limit to 2 per event
  v_email := lower(trim(COALESCE(p_data->>'Email Address', p_data->>'email', p_data->>'Email', '')));

  IF v_email IS NOT NULL AND v_email != '' THEN
    SELECT count(*) INTO v_email_count
    FROM registrations
    WHERE event_id = p_event_id
      AND status != 'cancelled'::registration_status
      AND lower(trim(COALESCE(data->>'Email Address', data->>'email', data->>'Email', ''))) = v_email;

    IF v_email_count >= 2 THEN
      RAISE EXCEPTION 'This email has already been used to register for this event';
    END IF;
  END IF;

  INSERT INTO registrations (event_id, data)
  VALUES (p_event_id, p_data)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

DROP POLICY IF EXISTS "Users can update own event assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own event assets" ON storage.objects;

CREATE POLICY "Users can update own event assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'event-assets' AND (owner)::uuid = auth.uid());

CREATE POLICY "Users can delete own event assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'event-assets' AND (owner)::uuid = auth.uid());
