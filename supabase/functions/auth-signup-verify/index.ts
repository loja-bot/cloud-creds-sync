import {
  corsHeaders, json, getIp, checkRateLimit, supabaseAdmin, comparePassword,
} from '../_shared/auth-utils.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { email, code, password } = await req.json();
    if (!email || !code || !password) return json({ error: 'Dados inválidos.' }, 400);

    const ip = getIp(req);
    if (!(await checkRateLimit(ip, 'signup_verify', 10, 60))) {
      return json({ error: 'Muitas tentativas.' }, 429);
    }

    const supa = supabaseAdmin();
    const { data: rec } = await supa
      .from('signup_verifications')
      .select('*')
      .ilike('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!rec) return json({ error: 'Solicitação não encontrada. Cadastre novamente.' }, 404);
    if (new Date(rec.expires_at) < new Date()) {
      await supa.from('signup_verifications').delete().eq('id', rec.id);
      return json({ error: 'Código expirado. Cadastre novamente.' }, 410);
    }
    if (rec.attempts >= 5) {
      await supa.from('signup_verifications').delete().eq('id', rec.id);
      return json({ error: 'Tentativas excedidas. Cadastre novamente.' }, 429);
    }

    const ok = await comparePassword(String(code), rec.code_hash);
    if (!ok) {
      await supa.from('signup_verifications').update({ attempts: rec.attempts + 1 }).eq('id', rec.id);
      return json({ error: 'Código incorreto.' }, 401);
    }

    const { data: created, error: createErr } = await supa.auth.admin.createUser({
      email: rec.email,
      password: password,
      email_confirm: true,
    });

    if (createErr) {
      return json({ error: createErr.message }, 400);
    }

    await supa.from('signup_verifications').delete().eq('id', rec.id);

    return json({ ok: true, user: created.user });
  } catch (e) {
    console.error('signup-verify error', e);
    return json({ error: 'Erro interno.' }, 500);
  }
});
