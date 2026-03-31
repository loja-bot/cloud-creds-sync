
-- Install tokens table (20 min expiry)
CREATE TABLE public.install_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '20 minutes'),
  created_by uuid NOT NULL
);

ALTER TABLE public.install_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read valid install tokens" ON public.install_tokens
  FOR SELECT TO anon, authenticated USING (expires_at > now());

CREATE POLICY "Authenticated can create install tokens" ON public.install_tokens
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- Install reviews table
CREATE TABLE public.install_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar_url text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.install_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews" ON public.install_reviews
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can insert reviews" ON public.install_reviews
  FOR INSERT TO anon, authenticated WITH CHECK (true);
