
CREATE TABLE public.share_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  stream_id integer NOT NULL,
  stream_type text NOT NULL CHECK (stream_type IN ('live', 'movie', 'series')),
  stream_title text NOT NULL,
  stream_url text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  extension text DEFAULT 'ts',
  episode_id integer,
  season_num integer,
  episode_num integer
);

ALTER TABLE public.share_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read valid tokens" ON public.share_tokens
  FOR SELECT TO anon, authenticated
  USING (expires_at > now());

CREATE POLICY "Authenticated can create tokens" ON public.share_tokens
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE INDEX idx_share_tokens_token ON public.share_tokens(token);
CREATE INDEX idx_share_tokens_expires ON public.share_tokens(expires_at);
