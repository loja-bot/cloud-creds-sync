-- 1) iptv_credentials: drop broad SELECT + remove from realtime publication
DROP POLICY IF EXISTS "Authenticated can read active credentials" ON public.iptv_credentials;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'iptv_credentials'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.iptv_credentials';
  END IF;
END $$;

-- 2) install_reviews: add owner column and tighten INSERT
ALTER TABLE public.install_reviews
  ADD COLUMN IF NOT EXISTS user_id uuid;

DROP POLICY IF EXISTS "Authenticated can insert reviews" ON public.install_reviews;

CREATE POLICY "Authenticated can insert own reviews"
  ON public.install_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND rating BETWEEN 1 AND 5
    AND length(name) BETWEEN 1 AND 80
    AND length(comment) BETWEEN 1 AND 1000
    AND (avatar_url IS NULL OR length(avatar_url) <= 500)
  );

-- 3) realtime.messages: require authenticated session
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'realtime' AND tablename = 'messages') THEN
    BEGIN
      EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'realtime' AND tablename = 'messages'
        AND policyname = 'Authenticated can use realtime'
    ) THEN
      BEGIN
        EXECUTE $p$
          CREATE POLICY "Authenticated can use realtime"
            ON realtime.messages
            FOR SELECT
            TO authenticated
            USING (auth.role() = 'authenticated')
        $p$;
      EXCEPTION WHEN insufficient_privilege THEN NULL;
      END;
    END IF;
  END IF;
END $$;

-- 4) SECURITY DEFINER functions: revoke EXECUTE from anon/authenticated/public for trigger-only fns
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_signup_rate_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_verify_age() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;