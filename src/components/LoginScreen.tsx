import React, { useEffect, useRef, useState } from "react";
import { Tv, Loader2, Mail, Lock, KeyRound, ArrowLeft } from "lucide-react";
import SupportChat from "@/components/SupportChat";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void; "error-callback"?: () => void; "expired-callback"?: () => void; theme?: string }) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

type Mode = "login" | "signup" | "verify" | "guest";

const FN_URL = (name: string) =>
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;

const TurnstileWidget: React.FC<{ siteKey: string; onToken: (t: string) => void }> = ({ siteKey, onToken }) => {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string>();

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    const render = () => {
      if (!window.turnstile || !ref.current) return;
      try {
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          theme: "dark",
          callback: onToken,
          "expired-callback": () => onToken(""),
          "error-callback": () => onToken(""),
        });
      } catch {}
    };
    if (window.turnstile) render();
    else {
      const existing = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
      if (!existing) {
        const s = document.createElement("script");
        s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback";
        s.async = true; s.defer = true;
        window.onloadTurnstileCallback = render;
        document.head.appendChild(s);
      } else {
        const i = setInterval(() => { if (window.turnstile) { clearInterval(i); render(); } }, 100);
      }
    }
    return () => {
      if (widgetId.current && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch {}
      }
    };
  }, [siteKey, onToken]);

  return <div ref={ref} className="flex justify-center" />;
};

const LoginScreen: React.FC = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [siteKey, setSiteKey] = useState<string>("");
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [guestToken, setGuestToken] = useState("");

  useEffect(() => {
    fetch(FN_URL("auth-config"))
      .then((r) => r.json()).then((d) => setSiteKey(d.turnstileSiteKey || ""))
      .catch(() => {});
  }, []);

  const callFn = async (name: string, body: unknown) => {
    const res = await fetch(FN_URL(name), {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify(body),
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };

  const handleGoogleLogin = async () => {
    setLoading(true); setError(null);
    try {
      const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (r.error) setError("Falha no login com Google.");
    } catch { setError("Erro de conexão."); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (siteKey && !turnstileToken) { setError("Aguarde a verificação anti-bot."); return; }
    setLoading(true);
    try {
      if (mode === "login") {
        const { status, data } = await callFn("auth-login", { email, password, turnstileToken });
        if (status !== 200) { setError(data.error || "Erro."); return; }
        await supabase.auth.setSession(data.session);
      } else if (mode === "signup") {
        const { status, data } = await callFn("auth-signup-request", { email, password, confirmPassword, turnstileToken });
        if (status !== 200) { setError(data.error || "Erro."); return; }
        setSuccess("Código enviado para seu e-mail!");
        setMode("verify");
      } else {
        const { status, data } = await callFn("auth-signup-verify", { email, code });
        if (status !== 200) { setError(data.error || "Erro."); return; }
        setSuccess("Conta verificada! Fazendo login...");
        const r = await callFn("auth-login", { email, password, turnstileToken });
        if (r.status === 200) await supabase.auth.setSession(r.data.session);
        else { setMode("login"); setSuccess("Conta verificada! Faça login."); }
      }
      if (window.turnstile) try { window.turnstile.reset(); } catch {}
      setTurnstileToken("");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally { setLoading(false); }
  };

  const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition";

  return (
    <>
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm w-full space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[var(--glow-primary-lg)]">
              <span className="font-display text-3xl font-black text-primary-foreground">T</span>
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-primary tracking-[0.3em]">THAYSON TV</h1>
              <p className="text-muted-foreground text-[10px] mt-1 tracking-wider">ENTRETENIMENTO DE ELITE</p>
            </div>
          </div>

          {mode !== "verify" && (
            <div className="flex bg-card rounded-xl p-1 border border-border">
              <button
                onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >Login</button>
              <button
                onClick={() => { setMode("signup"); setError(null); setSuccess(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >Cadastrar</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 text-left">
            {mode === "verify" ? (
              <>
                <button type="button" onClick={() => { setMode("signup"); setCode(""); setError(null); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                  <ArrowLeft className="w-3 h-3" /> Voltar
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  Digite o código de 6 dígitos enviado para <b className="text-foreground">{email}</b>
                </p>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text" inputMode="numeric" maxLength={6} required
                    value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className={`${inputCls} pl-10 text-center tracking-[0.5em] text-lg font-bold`}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className={`${inputCls} pl-10`} autoComplete="email" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha (mín. 8)" minLength={8} className={`${inputCls} pl-10`} autoComplete={mode === "login" ? "current-password" : "new-password"} />
                </div>
                {mode === "signup" && (
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmar senha" minLength={8} className={`${inputCls} pl-10`} autoComplete="new-password" />
                  </div>
                )}
                {siteKey && <TurnstileWidget siteKey={siteKey} onToken={setTurnstileToken} />}
                {!siteKey && <p className="text-[10px] text-muted-foreground text-center">Configurando proteção anti-bot…</p>}
              </>
            )}

            {error && <p className="text-destructive text-xs text-center">{error}</p>}
            {success && <p className="text-primary text-xs text-center">{success}</p>}

            <button type="submit" disabled={loading} className="tv-focusable w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 hover:bg-primary/90 transition">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "login" ? "Entrar" : mode === "signup" ? "Enviar código" : "Verificar"}
            </button>
          </form>

          {mode === "login" && (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground">OU</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <button onClick={handleGoogleLogin} disabled={loading} className="tv-focusable w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-card border border-border hover:border-primary/40 transition text-foreground text-sm font-semibold disabled:opacity-50">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Entrar com Google
              </button>
            </>
          )}
        </div>
      </div>
      <SupportChat />
    </>
  );
};

export default LoginScreen;
