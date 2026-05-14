import bcrypt from 'npm:bcryptjs@2.4.3';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

export const supabaseAdmin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

export const getIp = (req: Request) =>
  req.headers.get('cf-connecting-ip') ||
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  'unknown';

export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret) return false;
  if (!token) return false;
  try {
    const body = new FormData();
    body.append('secret', secret);
    body.append('response', token);
    body.append('remoteip', ip);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const json = await res.json();
    return !!json.success;
  } catch {
    return false;
  }
}

export async function checkRateLimit(
  identifier: string,
  action: string,
  maxAttempts: number,
  windowMinutes: number,
): Promise<boolean> {
  const supa = supabaseAdmin();
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count } = await supa
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('identifier', identifier)
    .eq('action', action)
    .gte('attempt_at', since);
  if ((count ?? 0) >= maxAttempts) return false;
  await supa.from('rate_limits').insert({ identifier, action });
  return true;
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const comparePassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export const generateCode = () =>
  String(Math.floor(100000 + Math.random() * 900000));

export async function sendCodeEmail(to: string, code: string) {
  const user = Deno.env.get('GMAIL_SMTP_USER');
  const pass = Deno.env.get('GMAIL_SMTP_APP_PASSWORD');
  if (!user || !pass) throw new Error('SMTP not configured');

  const nodemailer = await import('npm:nodemailer@6.9.14');
  const transporter = nodemailer.default.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  const html = `
  <div style="font-family:Arial,sans-serif;background:#0a0a0a;padding:32px;color:#fff;border-radius:12px;max-width:480px;margin:auto">
    <h1 style="color:#FFD700;text-align:center;letter-spacing:4px;margin:0 0 8px">THAYSON TV</h1>
    <p style="text-align:center;color:#888;margin:0 0 24px">Código de verificação</p>
    <div style="background:#1a1a1a;border:2px solid #FFD700;border-radius:12px;padding:24px;text-align:center">
      <div style="font-size:42px;font-weight:bold;letter-spacing:12px;color:#FFD700">${code}</div>
    </div>
    <p style="color:#888;font-size:13px;margin-top:24px;text-align:center">
      Este código expira em 15 minutos. Se você não solicitou, ignore este e-mail.
    </p>
  </div>`;

  await transporter.sendMail({
    from: `"THAYSON TV" <${user}>`,
    to,
    subject: `Seu código THAYSON TV: ${code}`,
    text: `Seu código de verificação é: ${code}\n\nExpira em 15 minutos.`,
    html,
  });
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
export { corsHeaders };
