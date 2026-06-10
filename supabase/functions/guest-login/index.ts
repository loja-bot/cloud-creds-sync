import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { token } = await req.json();
    if (!token || typeof token !== 'string') return json({ error: 'Token obrigatório.' }, 400);

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    const { data: tok, error: tokErr } = await supa
      .from('guest_tokens').select('*').eq('token', token).maybeSingle();
    if (tokErr || !tok) return json({ error: 'Token inválido.' }, 404);
    if (new Date(tok.expires_at) < new Date()) return json({ error: 'Token expirado.' }, 410);

    const sessionExpiresAt = tok.session_expires_at
      ? new Date(tok.session_expires_at)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    // If session already expired, block
    if (sessionExpiresAt < new Date()) return json({ error: 'Acesso de visitante expirado.' }, 410);

    const email = `guest_${tok.token.toLowerCase()}@guest.local`;
    const password = `g_${tok.token}_${tok.id}`;

    let userId = tok.user_id as string | null;

    if (!userId) {
      // First use — create the auth user
      const { data: created, error: cErr } = await supa.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { is_guest: true, guest_username: tok.username },
      });
      if (cErr || !created.user) return json({ error: cErr?.message || 'Falha ao criar visitante.' }, 500);
      userId = created.user.id;

      // Set app_users guest flag + expiration
      await supa.from('app_users').upsert({
        user_id: userId,
        email,
        display_name: tok.username,
        is_guest: true,
        is_permanent: false,
        account_expires_at: sessionExpiresAt.toISOString(),
      }, { onConflict: 'user_id' });

      // Auto-verify age as adult-blocked (treat as not adult by category filter; mark verified=false won't work — set verified true with minor cat so adult filter applies)
      await supa.from('age_verifications').upsert({
        user_id: userId,
        birth_date: '2015-01-01', // minor: blocks adult content
        is_verified: true,
        age_category: 'minor_10_plus',
        verified_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      await supa.from('guest_tokens').update({
        user_id: userId,
        used_at: new Date().toISOString(),
        session_expires_at: sessionExpiresAt.toISOString(),
      }).eq('id', tok.id);
    }

    // Sign in to get session
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { auth: { persistSession: false } },
    );
    const { data: signIn, error: sErr } = await anonClient.auth.signInWithPassword({ email, password });
    if (sErr || !signIn.session) return json({ error: sErr?.message || 'Falha ao iniciar sessão.' }, 500);

    return json({ session: signIn.session, expires_at: sessionExpiresAt.toISOString() });
  } catch (e) {
    console.error('guest-login error', e);
    return json({ error: 'Erro interno.' }, 500);
  }
});
