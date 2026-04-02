
-- 1. Fix IPTV credentials: only authenticated users can read
DROP POLICY IF EXISTS "Anyone can read active credentials" ON public.iptv_credentials;
CREATE POLICY "Authenticated can read active credentials"
ON public.iptv_credentials
FOR SELECT
TO authenticated
USING (is_active = true);

-- 2. Fix app_settings: split read access - public for non-sensitive, service_role for sensitive
DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;

CREATE POLICY "Authenticated can read non-sensitive settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (key NOT IN ('admin_emails'));

CREATE POLICY "Anon can read public settings"
ON public.app_settings
FOR SELECT
TO anon
USING (key IN ('maintenance_mode', 'app_link'));

-- 3. Fix reviews: only authenticated users can insert
DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.install_reviews;
CREATE POLICY "Authenticated can insert reviews"
ON public.install_reviews
FOR INSERT
TO authenticated
WITH CHECK (true);
