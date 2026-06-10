
-- Add guest flag to app_users
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT false;

-- Guest tokens table
CREATE TABLE IF NOT EXISTS public.guest_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  session_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guest_tokens_token_idx ON public.guest_tokens (token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_tokens TO authenticated;
GRANT ALL ON public.guest_tokens TO service_role;

ALTER TABLE public.guest_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role accesses this (edge functions). No client policies.
CREATE POLICY "guest_tokens_no_client_access" ON public.guest_tokens
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
