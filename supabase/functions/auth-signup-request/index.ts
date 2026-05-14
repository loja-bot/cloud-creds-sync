import {
  corsHeaders, json, getIp, verifyTurnstile, checkRateLimit,
  hashPassword, generateCode, sendCodeEmail, supabaseAdmin,
} from '../_shared/auth-utils.ts';
import bcrypt from 'npm:bcryptjs@2.4.3';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { email, password, confirmPassword, turnstileToken } = await req.json();
    if (!email || !password || !confirmPassword) return json({ error: 'Campos obrigatórios faltando.' }, 400);
    if (password !== confirmPassword) return json({ error: 'As senhas não conferem.' }, 400);
    if (password.length < 8) return json({ error: 'Senha deve ter ao menos 8 caracteres.' }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'E-mail inválido.' }, 400);

    const ip = getIp(req);
    if (!(await verifyTurnstile(turnstileToken, ip))) {
      return json({ error: 'Verificação anti-bot falhou. Recarregue a página.' }, 403);
    }
    if (!(await checkRateLimit(ip, 'signup_request', 5, 60))) {
      return json({ error: 'Muitas tentativas. Tente novamente em 1 hora.' }, 429);
    }
    if (!(await checkRateLimit(email.toLowerCase(), 'signup_request_email', 3, 60))) {
      return json({ error: 'Muitas tentativas para este e-mail.' }, 429);
    }

    const supa = supabaseAdmin();
    const { data: existing } = await supa.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (existing?.users?.some((u) => u.email?.toLowerCase() === email.toLowerCase())) {
      return json({ error: 'E-mail já cadastrado. Faça login.' }, 409);
    }

    const code = generateCode();
    const codeHash = await bcrypt.hash(code, 8);
    const passwordHash = await hashPassword(password);

    await supa.from('signup_verifications').delete().ilike('email', email);
    const { error: insErr } = await supa.from('signup_verifications').insert({
      email: email.toLowerCase(),
      password_hash: passwordHash,
      code_hash: codeHash,
      ip_address: ip,
    });
    if (insErr) return json({ error: 'Falha ao registrar verificação.' }, 500);

    await sendCodeEmail(email, code);
    return json({ ok: true, message: 'Código enviado para seu e-mail.' });
  } catch (e) {
    console.error('signup-request error', e);
    return json({ error: 'Erro interno. Tente novamente.' }, 500);
  }
});
