import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Tv, Wrench, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MaintenanceScreenProps {
  message?: string;
}

const LAST_TRY_KEY = "thayson_tv_last_playlist_fetch";
const COOLDOWN_MS = 45_000;

const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ message }) => {
  const [loading, setLoading] = useState(false);
  const autoTriedRef = useRef(false);

  const fetchNewPlaylist = async (manual = false) => {
    if (loading) return;
    const last = Number(localStorage.getItem(LAST_TRY_KEY) || 0);
    const since = Date.now() - last;
    if (!manual && since < COOLDOWN_MS) return;
    if (manual && since < 5000) {
      toast.info("Aguarde alguns segundos antes de tentar novamente.");
      return;
    }

    setLoading(true);
    localStorage.setItem(LAST_TRY_KEY, String(Date.now()));
    try {
      const { data, error } = await supabase.functions.invoke("refresh-playlist", { body: {} });
      if (error) throw error;
      if (data?.ok) {
        toast.success("Nova playlist obtida!", { description: "Atualizando em instantes..." });
      } else if (data?.throttled) {
        if (manual) toast.info("Aguarde um momento e tente novamente.");
      } else {
        if (manual) toast.error("Não foi possível obter agora", { description: data?.error ?? "Tente novamente." });
      }
    } catch (e) {
      if (manual) toast.error("Falha ao atualizar playlist");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoTriedRef.current) return;
    autoTriedRef.current = true;
    fetchNewPlaylist(false);
    const id = setInterval(() => fetchNewPlaylist(false), 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md space-y-6"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20"
        >
          <Wrench className="w-10 h-10 text-primary" />
        </motion.div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Tv className="w-6 h-6 text-primary" />
            <h1 className="font-display text-xl font-bold text-primary tracking-wider">THAYSON TV</h1>
          </div>
          <h2 className="text-foreground text-lg font-semibold">Em Manutenção</h2>
          <p className="text-muted-foreground text-sm">
            {message || "Aguardando nova playlist. Estamos buscando automaticamente para você."}
          </p>
        </div>

        <button
          onClick={() => fetchNewPlaylist(true)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {loading ? "Atualizando..." : "Atualizar playlist agora"}
        </button>

        <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Verificando atualizações automaticamente...</span>
        </div>
      </motion.div>
    </div>
  );
};

export default MaintenanceScreen;
