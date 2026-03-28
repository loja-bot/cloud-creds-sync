
-- App users table (linked to Google auth)
CREATE TABLE public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email text NOT NULL,
  display_name text,
  avatar_url text,
  account_expires_at timestamp with time zone,
  is_permanent boolean NOT NULL DEFAULT false,
  is_banned boolean NOT NULL DEFAULT false,
  ban_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_login timestamp with time zone DEFAULT now()
);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.app_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service can manage all users" ON public.app_users
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- App settings table (admin-controlled)
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" ON public.app_settings
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Service can manage settings" ON public.app_settings
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES
  ('maintenance_mode', '{"enabled": false, "message": "Em manutenção"}'::jsonb),
  ('default_host', '"http://cdnflash.top:80"'::jsonb);

-- Trigger to auto-create app_user on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.app_users (user_id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
