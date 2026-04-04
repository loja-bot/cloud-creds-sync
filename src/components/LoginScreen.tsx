import React, { useState } from "react";
import { motion } from "framer-motion";
import { Tv, Loader2 } from "lucide-react";
import SupportChat from "@/components/SupportChat";
import { lovable } from "@/integrations/lovable/index";

const LoginScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError("Falha ao fazer login. Tente novamente.");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm w-full space-y-8"
        >
          {/* Logo */}
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[var(--glow-primary-lg)]">
              <span className="font-display text-4xl font-black text-primary-foreground">T</span>
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-primary tracking-[0.3em]">THAYSON TV</h1>
              <p className="text-muted-foreground text-xs mt-1 tracking-wider">ENTRETENIMENTO DE ELITE</p>
            </div>
          </motion.div>

          {/* Login button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="tv-focusable w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-card border border-border hover:border-primary/40 transition-all text-foreground font-semibold disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {loading ? "Entrando..." : "Entrar com Google"}
            </button>

            {error && (
              <p className="text-destructive text-xs">{error}</p>
            )}

            <p className="text-muted-foreground text-[10px]">
              Faça login para acessar o conteúdo
            </p>
          </motion.div>
        </motion.div>
      </div>
      <SupportChat />
    </>
  );
};

export default LoginScreen;
