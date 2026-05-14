import {
  corsHeaders, json, getIp, checkRateLimit, supabaseAdmin,
} from '../_shared/auth-utils.ts';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { email, code } = await req.json();
    if (!email || !code) return json({ error: 'Dados inválidos.' }, 400);

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

    const ok = await bcrypt.compare(String(code), rec.code_hash);
    if (!ok) {
      await supa.from('signup_verifications').update({ attempts: rec.attempts + 1 }).eq('id', rec.id);
      return json({ error: 'Código incorreto.' }, 401);
    }

    const userId = rec.password_hash; // we stored user_id here
    const { error: updErr } = await supa.auth.admin.updateUserById(userId, { email_confirm: true });
    if (updErr) return json({ error: 'Falha ao confirmar conta.' }, 500);

    await supa.from('signup_verifications').delete().eq('id', rec.id);
    return json({ ok: true, message: 'Conta verificada! Faça login.' });
  } catch (e) {
    console.error('signup-verify error', e);
    return json({ error: 'Erro interno.' }, 500);
  }
});
