
CREATE TABLE IF NOT EXISTS public.signup_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  code_hash text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  ip_address text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signup_verifications_email ON public.signup_verifications(lower(email));
CREATE INDEX IF NOT EXISTS idx_signup_verifications_expires ON public.signup_verifications(expires_at);

ALTER TABLE public.signup_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service can manage signup verifications"
ON public.signup_verifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
