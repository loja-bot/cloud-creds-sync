import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Tv, Play, Pause, Maximize, SkipBack, SkipForward,
  ArrowLeft, Volume2, VolumeX, ExternalLink, Loader2, ShieldX
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import mpegts from "mpegts.js";
import InstaWatermark from "@/components/InstaWatermark";

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

const PROMO_DELAY_MS = 50 * 60 * 1000; // 50 minutes

const SharePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appLink, setAppLink] = useState<string>("/");
  const [playing, setPlaying] = useState(false);

  // Player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<mpegts.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();
  const promoTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const fetchData = async () => {
      if (!token) { setError("Link inválido"); setLoading(false); return; }

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
    fetchData();
  }, [token]);

  // Hide controls timer
  const hideControlsLater = useCallback(() => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    setShowControls(true);
    controlsTimer.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  // Setup video player
  useEffect(() => {
    if (!playing || !data || !videoRef.current) return;

    const proxyBase = `${import.meta.env.VITE_SUPABASE_URL || ""}/functions/v1/iptv-proxy`;
    const proxiedUrl = `${proxyBase}?streamUrl=${encodeURIComponent(data.stream_url)}`;
    const video = videoRef.current;
    const isLive = data.stream_type === "live";

    if (playerRef.current) {
      try { playerRef.current.pause(); playerRef.current.unload(); playerRef.current.detachMediaElement(); playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }

    if (isLive && mpegts.isSupported()) {
      const player = mpegts.createPlayer({
        type: "mpegts",
        isLive: true,
        url: proxiedUrl,
      }, {
        enableWorker: true,
        lazyLoadMaxDuration: 5 * 60,
        seekType: "range",
      });
      player.attachMediaElement(video);
      player.load();
      player.play();
      playerRef.current = player;
    } else {
      video.src = proxiedUrl;
      video.load();
      video.play().catch(() => {});
    }

    setIsPlaying(true);
    hideControlsLater();

    // 50-min promo timer
    promoTimer.current = setTimeout(() => setShowPromo(true), PROMO_DELAY_MS);

    return () => {
      if (promoTimer.current) clearTimeout(promoTimer.current);
      if (playerRef.current) {
        try { playerRef.current.pause(); playerRef.current.unload(); playerRef.current.detachMediaElement(); playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
      video.removeAttribute("src");
      video.load();
    };
  }, [playing, data]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }
    else { videoRef.current.pause(); setIsPlaying(false); }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current.requestFullscreen();
  };

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video || !isFinite(video.duration)) return;
    const clamped = Math.max(0, Math.min(time, video.duration));
    video.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || isSeeking) return;
    setCurrentTime(video.currentTime);
    if (video.duration && isFinite(video.duration)) setDuration(video.duration);
  };

  const getTimeFromEvent = useCallback((clientX: number) => {
    if (!progressBarRef.current || !duration) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * duration;
  }, [duration]);

  const handleProgressMouseDown = useCallback((e: React.MouseEvent) => {
    if (data?.stream_type === "live") return;
    e.preventDefault();
    setIsSeeking(true);
    setCurrentTime(getTimeFromEvent(e.clientX));
    const onMove = (ev: MouseEvent) => setCurrentTime(getTimeFromEvent(ev.clientX));
    const onUp = (ev: MouseEvent) => {
      seekTo(getTimeFromEvent(ev.clientX));
      setIsSeeking(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [getTimeFromEvent, seekTo, data]);

  const handleProgressTouchStart = useCallback((e: React.TouchEvent) => {
    if (data?.stream_type === "live") return;
    e.preventDefault();
    setIsSeeking(true);
    setCurrentTime(getTimeFromEvent(e.touches[0].clientX));
    const onMove = (ev: TouchEvent) => setCurrentTime(getTimeFromEvent(ev.touches[0].clientX));
    const onEnd = (ev: TouchEvent) => {
      seekTo(getTimeFromEvent(ev.changedTouches[0].clientX));
      setIsSeeking(false);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
  }, [getTimeFromEvent, seekTo, data]);

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const goToApp = () => {
    if (appLink && appLink !== "/") window.open(appLink, "_blank", "noopener");
    else window.location.href = "/";
  };

  // Loading
  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Error
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

  // Video player mode
  if (playing) {
    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
    const isLive = data.stream_type === "live";

    return (
      <div ref={containerRef} className="h-screen bg-background relative" onMouseMove={hideControlsLater} onClick={hideControlsLater}>
        <video
          ref={videoRef}
          className="w-full h-full"
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={() => { if (videoRef.current) setDuration(videoRef.current.duration || 0); }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          playsInline
        />

        {/* Controls overlay */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col justify-between pointer-events-none"
            >
              {/* Top bar */}
              <div className="flex items-center gap-3 p-4 bg-gradient-to-b from-background/80 to-transparent pointer-events-auto">
                <button onClick={() => setPlaying(false)} className="w-10 h-10 rounded-full bg-card/60 flex items-center justify-center">
                  <ArrowLeft className="w-5 h-5 text-foreground" />
                </button>
                <h2 className="text-foreground font-semibold text-lg truncate">{data.stream_title}</h2>
                {isLive && <span className="px-2 py-0.5 rounded bg-destructive text-destructive-foreground text-xs font-bold">AO VIVO</span>}
              </div>

              {/* Center play */}
              <div className="flex items-center justify-center gap-8 pointer-events-auto">
                {!isLive && (
                  <button onClick={() => seekTo(currentTime - 10)} className="w-14 h-14 rounded-full bg-card/40 flex items-center justify-center">
                    <SkipBack className="w-7 h-7 text-foreground" />
                  </button>
                )}
                <button onClick={togglePlay} className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                  {isPlaying ? <Pause className="w-10 h-10 text-primary" /> : <Play className="w-10 h-10 text-primary ml-1" />}
                </button>
                {!isLive && (
                  <button onClick={() => seekTo(currentTime + 10)} className="w-14 h-14 rounded-full bg-card/40 flex items-center justify-center">
                    <SkipForward className="w-7 h-7 text-foreground" />
                  </button>
                )}
              </div>

              {/* Bottom bar */}
              <div className="p-4 bg-gradient-to-t from-background/80 to-transparent space-y-3 pointer-events-auto">
                {!isLive && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-14 text-right font-mono">{formatTime(currentTime)}</span>
                    <div
                      ref={progressBarRef}
                      className="flex-1 h-3 bg-secondary/60 rounded-full cursor-pointer relative group"
                      onMouseDown={handleProgressMouseDown}
                      onTouchStart={handleProgressTouchStart}
                    >
                      <div className="h-full bg-primary rounded-full relative" style={{ width: `${Math.min(progressPct, 100)}%` }}>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary border-2 border-primary-foreground shadow-lg transform translate-x-1/2" />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-14 font-mono">{formatTime(duration)}</span>
                  </div>
                )}
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => { setMuted(!muted); if (videoRef.current) videoRef.current.muted = !muted; }}
                    className="w-10 h-10 rounded-full bg-card/60 flex items-center justify-center">
                    {muted ? <VolumeX className="w-5 h-5 text-foreground" /> : <Volume2 className="w-5 h-5 text-foreground" />}
                  </button>
                  <button onClick={toggleFullscreen} className="w-10 h-10 rounded-full bg-card/60 flex items-center justify-center">
                    <Maximize className="w-5 h-5 text-foreground" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Promo popup after 50 min */}
        <AnimatePresence>
          {showPromo && (
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="absolute top-4 left-4 right-4 z-[70] pointer-events-auto"
            >
              <div className="bg-card/95 backdrop-blur-md border border-primary/30 rounded-2xl p-5 space-y-3 shadow-[0_0_30px_hsla(135,100%,50%,0.15)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
                    <span className="font-display text-lg font-black text-primary-foreground">T</span>
                  </div>
                  <div>
                    <h3 className="text-foreground font-semibold text-sm">Curtindo a reprodução? 🍿</h3>
                    <p className="text-muted-foreground text-xs">
                      Entre no app original com filmes, séries, canais ao vivo e muito mais — tudo grátis!
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={goToApp}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" /> Ir pro App
                  </button>
                  <button
                    onClick={() => setShowPromo(false)}
                    className="px-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
                  >
                    Depois
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Watermark */}
        <InstaWatermark />
      </div>
    );
  }

  // Landing page
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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[0_0_40px_hsla(135,100%,50%,0.3)]">
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
              onClick={goToApp}
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

        <p className="text-center text-muted-foreground text-[10px]">
          Link seguro criptografado • Expira automaticamente
        </p>
      </motion.div>
    </div>
  );
};

export default SharePage;
