
CREATE TABLE public.iptv_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  host TEXT NOT NULL DEFAULT 'http://cdnflash.top:80',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  bot_source TEXT DEFAULT 'seven_tv'
);

ALTER TABLE public.iptv_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active credentials" ON public.iptv_credentials
  FOR SELECT TO anon, authenticated USING (is_active = true);
