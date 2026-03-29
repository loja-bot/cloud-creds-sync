import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tv, Play, ExternalLink, Loader2, ShieldX } from "lucide-react";
import { motion } from "framer-motion";

interface ShareData {
  stream_title: string;
  stream_url: string;
  stream_type: string;
  stream_id: number;
  extension: string | null;
  episode_id: number | null;
  season_num: number | null;
  episode_num: number | null;
  expires_at: string;
}

const SharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appLink, setAppLink] = useState<string>("/");
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!token) { setError("Link inválido"); setLoading(false); return; }

      // Fetch share token data
      const { data: shareData, error: shareErr } = await supabase
        .from("share_tokens")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (shareErr || !shareData) {
        setError("Link expirado ou inválido");
        setLoading(false);
        return;
      }

      if (new Date(shareData.expires_at) < new Date()) {
        setError("Este link expirou");
        setLoading(false);
        return;
      }

      setData(shareData as ShareData);

      // Fetch app_link from settings
      const { data: settings } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "app_link")
        .maybeSingle();

      if (settings?.value) {
        const val = typeof settings.value === "string" ? settings.value : (settings.value as any).url || "/";
        setAppLink(val);
      }

      setLoading(false);
    };
    fetch();
  }, [token]);

  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-6">
          <ShieldX className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="font-display text-xl font-bold text-foreground">{error || "Erro"}</h1>
          <p className="text-muted-foreground text-sm">O link não é mais válido ou não existe.</p>
        </div>
      </div>
    );
  }

  // Build proxied stream URL for browser playback
  const proxyBase = `${import.meta.env.VITE_SUPABASE_URL || ""}/functions/v1/iptv-proxy`;
  const streamUrl = `${proxyBase}?streamUrl=${encodeURIComponent(data.stream_url)}`;

  if (playing) {
    return (
      <div className="h-screen bg-background flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-border/50">
          <button onClick={() => setPlaying(false)} className="text-muted-foreground hover:text-foreground">
            ← Voltar
          </button>
          <h2 className="text-foreground font-semibold truncate">{data.stream_title}</h2>
        </div>
        <div className="flex-1 flex items-center justify-center bg-black">
          <video
            src={streamUrl}
            controls
            autoPlay
            playsInline
            className="w-full h-full max-h-screen"
          />
        </div>
      </div>
    );
  }

  const expiresDate = new Date(data.expires_at).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  return (
    <div className="h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full space-y-6"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
            <span className="font-display text-3xl font-black text-primary-foreground">T</span>
          </div>
          <h1 className="font-display text-lg font-bold text-primary tracking-[0.2em]">THAYSON TV</h1>
        </div>

        {/* Content info */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Tv className="w-5 h-5 text-primary" />
            <h2 className="text-foreground font-semibold">{data.stream_title}</h2>
          </div>
          <p className="text-muted-foreground text-xs">
            {data.stream_type === "live" ? "🔴 Ao Vivo" : data.stream_type === "movie" ? "🎬 Filme" : "📺 Série"}
            {data.episode_num && ` • S${data.season_num}E${data.episode_num}`}
          </p>
          <p className="text-muted-foreground text-[10px]">Expira em: {expiresDate}</p>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                if (appLink && appLink !== "/") {
                  window.open(appLink, "_blank", "noopener");
                } else {
                  window.location.href = "/";
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm transition-all hover:bg-primary/90"
            >
              <ExternalLink className="w-4 h-4" /> Ir pro App
            </button>
            <button
              onClick={() => setPlaying(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-card border border-border text-foreground font-bold text-sm transition-all hover:bg-muted/50"
            >
              <Play className="w-4 h-4" /> Assistir via Navegador
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SharePage;