import {
  corsHeaders, json, getIp, verifyTurnstile, checkRateLimit,
} from '../_shared/auth-utils.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { email, password, turnstileToken } = await req.json();
    if (!email || !password) return json({ error: 'Dados inválidos.' }, 400);

    const ip = getIp(req);
    if (!(await verifyTurnstile(turnstileToken, ip))) {
      return json({ error: 'Verificação anti-bot falhou.' }, 403);
    }
    if (!(await checkRateLimit(ip, 'login', 8, 15))) {
      return json({ error: 'Muitas tentativas. Aguarde 15 minutos.' }, 429);
    }
    if (!(await checkRateLimit(email.toLowerCase(), 'login_email', 5, 15))) {
      return json({ error: 'Muitas tentativas para este e-mail.' }, 429);
    }

    const anon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { auth: { persistSession: false } },
    );
    const { data, error } = await anon.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return json({ error: 'E-mail ou senha incorretos.' }, 401);
    }
    return json({
      ok: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  } catch (e) {
    console.error('auth-login error', e);
    return json({ error: 'Erro interno.' }, 500);
  }
});
