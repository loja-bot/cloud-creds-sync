import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Maximize, SkipBack, SkipForward, ArrowLeft, Volume2, VolumeX, MoreVertical, Share2, ExternalLink, X, Check, Copy } from "lucide-react";
import CastButton from "@/components/CastButton";
import mpegts from "mpegts.js";
import { useApp } from "@/contexts/AppContext";
import { saveContinueWatching, getContinueWatching } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VideoPlayer: React.FC = () => {
  const { playerState, closePlayer } = useApp();
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<mpegts.Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();
  const saveTimer = useRef<ReturnType<typeof setInterval>>();
  const resumeTimeRef = useRef<number>(0);
  const hasResumedRef = useRef(false);
  const isLiveRef = useRef(false);

  const hideControlsLater = useCallback(() => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    setShowControls(true);
    controlsTimer.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  // Determine saved progress for this stream
  useEffect(() => {
    if (!playerState) return;
    const items = getContinueWatching();
    const saved = items.find(i => i.id === playerState.streamId && i.type === playerState.type);
    if (saved?.progress && saved.progress > 5) {
      resumeTimeRef.current = saved.progress;
    } else {
      resumeTimeRef.current = 0;
    }
    hasResumedRef.current = false;
    isLiveRef.current = playerState.type === "live";
  }, [playerState]);

  // Setup player
  useEffect(() => {
    if (!playerState || !videoRef.current) return;

    const url = playerState.url;
    if (!url) return;

    const proxyBase = `${import.meta.env.VITE_SUPABASE_URL || ""}/functions/v1/iptv-proxy`;
    const proxiedUrl = `${proxyBase}?streamUrl=${encodeURIComponent(url)}`;
    const video = videoRef.current;
    const isLive = playerState.type === "live";

    // Cleanup previous player
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        playerRef.current.unload();
        playerRef.current.detachMediaElement();
        playerRef.current.destroy();
      } catch {}
      playerRef.current = null;
    }

    if (isLive && mpegts.isSupported()) {
      // Only use mpegts.js for LIVE streams (no seeking needed)
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
      // For VOD (movies/series) use native <video> - supports Range seeking
      video.src = proxiedUrl;
      video.load();
      video.play().catch(() => {});
    }

    setPlaying(true);
    setCurrentTime(0);
    setDuration(0);
    hideControlsLater();

    // Save progress every 5 seconds
    saveTimer.current = setInterval(() => {
      if (video && !video.paused && video.currentTime > 0 && playerState) {
        saveContinueWatching({
          id: playerState.streamId,
          type: playerState.type,
          name: playerState.title,
          icon: "",
          timestamp: Date.now(),
          progress: video.currentTime,
          duration: video.duration || 0,
          extension: playerState.extension,
          episodeId: playerState.episodeId,
          seasonNum: playerState.seasonNum,
          episodeNum: playerState.episodeNum,
        });
      }
    }, 5000);

    return () => {
      // Save final position
      if (video && video.currentTime > 0 && playerState) {
        saveContinueWatching({
          id: playerState.streamId,
          type: playerState.type,
          name: playerState.title,
          icon: "",
          timestamp: Date.now(),
          progress: video.currentTime,
          duration: video.duration || 0,
          extension: playerState.extension,
          episodeId: playerState.episodeId,
          seasonNum: playerState.seasonNum,
          episodeNum: playerState.episodeNum,
        });
      }
      if (saveTimer.current) clearInterval(saveTimer.current);
      if (playerRef.current) {
        try {
          playerRef.current.pause();
          playerRef.current.unload();
          playerRef.current.detachMediaElement();
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
      // Clear native src too
      video.removeAttribute("src");
      video.load();
    };
  }, [playerState]);  // intentionally not including hideControlsLater

  // Resume from saved position
  const onLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video || hasResumedRef.current) return;
    setDuration(video.duration || 0);
    if (resumeTimeRef.current > 0 && isFinite(video.duration) && video.duration > resumeTimeRef.current) {
      video.currentTime = resumeTimeRef.current;
      hasResumedRef.current = true;
    }
  }, []);

  // Also try to resume on canplay (some streams don't fire loadedmetadata with duration)
  const onCanPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || hasResumedRef.current) return;
    if (video.duration && isFinite(video.duration)) {
      setDuration(video.duration);
      if (resumeTimeRef.current > 0 && video.duration > resumeTimeRef.current) {
        video.currentTime = resumeTimeRef.current;
        hasResumedRef.current = true;
      }
    }
  }, []);

  // Seek function that works with native video
  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video || !isFinite(video.duration)) return;
    const clamped = Math.max(0, Math.min(time, video.duration));
    video.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      switch (e.key) {
        case "Escape":
        case "Backspace":
          e.preventDefault();
          closePlayer();
          break;
        case " ":
        case "Enter":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (!isLiveRef.current) seekTo(video.currentTime + 10);
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (!isLiveRef.current) seekTo(video.currentTime - 10);
          break;
      }
      hideControlsLater();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closePlayer, hideControlsLater, seekTo]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || isSeeking) return;
    setCurrentTime(video.currentTime);
    if (video.duration && isFinite(video.duration)) setDuration(video.duration);
  };

  // Progress bar click/drag
  const getTimeFromMouseEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!progressBarRef.current || !duration) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return pct * duration;
  }, [duration]);

  const handleProgressMouseDown = useCallback((e: React.MouseEvent) => {
    if (isLiveRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    setIsSeeking(true);
    const time = getTimeFromMouseEvent(e);
    setCurrentTime(time);

    const onMove = (ev: MouseEvent) => {
      const t = getTimeFromMouseEvent(ev);
      setCurrentTime(t);
    };
    const onUp = (ev: MouseEvent) => {
      const t = getTimeFromMouseEvent(ev);
      seekTo(t);
      setIsSeeking(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [getTimeFromMouseEvent, seekTo]);

  // Touch support
  const handleProgressTouchStart = useCallback((e: React.TouchEvent) => {
    if (isLiveRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    setIsSeeking(true);
    const touch = e.touches[0];
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    setCurrentTime(pct * duration);

    const onMove = (ev: TouchEvent) => {
      const t = ev.touches[0];
      if (!progressBarRef.current) return;
      const r = progressBarRef.current.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (t.clientX - r.left) / r.width));
      setCurrentTime(p * duration);
    };
    const onEnd = (ev: TouchEvent) => {
      const t = ev.changedTouches[0];
      if (!progressBarRef.current) return;
      const r = progressBarRef.current.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (t.clientX - r.left) / r.width));
      seekTo(p * duration);
      setIsSeeking(false);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
  }, [duration, seekTo]);

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Generate share link
  const handleShare = async () => {
    if (!playerState) return;
    setSharing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Faça login para compartilhar"); return; }
      
      const { data, error } = await supabase.from("share_tokens").insert({
        stream_id: playerState.streamId,
        stream_type: playerState.type,
        stream_title: playerState.title,
        stream_url: playerState.url,
        created_by: user.id,
        extension: playerState.extension || "ts",
        episode_id: playerState.episodeId,
        season_num: playerState.seasonNum,
        episode_num: playerState.episodeNum,
      }).select("token").single();

      if (error) throw error;
      const url = `${window.location.origin}/share/${data.token}`;
      setShareUrl(url);
      setShowMenu(false);
    } catch (e) {
      console.error("Share error:", e);
      toast.error("Erro ao gerar link");
    } finally {
      setSharing(false);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiado!");
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  if (!playerState) return null;

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isLive = playerState.type === "live";

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background"
      onMouseMove={hideControlsLater}
      onClick={hideControlsLater}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onCanPlay={onCanPlay}
        onEnded={closePlayer}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        playsInline
      />

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
              <button data-focusable onClick={closePlayer} className="tv-focusable w-10 h-10 rounded-full bg-card/60 flex items-center justify-center">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <h2 className="text-foreground font-semibold text-lg truncate">{playerState.title}</h2>
              {isLive && <span className="px-2 py-0.5 rounded bg-destructive text-destructive-foreground text-xs font-bold">AO VIVO</span>}
              <div className="ml-auto relative">
                <button data-focusable onClick={() => setShowMenu(!showMenu)} className="tv-focusable w-10 h-10 rounded-full bg-card/60 flex items-center justify-center">
                  <MoreVertical className="w-5 h-5 text-foreground" />
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute right-0 top-12 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[180px] z-50"
                    >
                      <button
                        onClick={handleShare}
                        disabled={sharing}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                      >
                        <Share2 className="w-4 h-4" />
                        {sharing ? "Gerando..." : "Compartilhar link"}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Center play */}
            <div className="flex items-center justify-center gap-8 pointer-events-auto">
              {!isLive && (
                <button data-focusable onClick={() => seekTo(currentTime - 10)}
                  className="tv-focusable w-14 h-14 rounded-full bg-card/40 flex items-center justify-center">
                  <SkipBack className="w-7 h-7 text-foreground" />
                </button>
              )}
              <button data-focusable onClick={togglePlay} className="tv-focusable w-20 h-20 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                {playing ? <Pause className="w-10 h-10 text-primary" /> : <Play className="w-10 h-10 text-primary ml-1" />}
              </button>
              {!isLive && (
                <button data-focusable onClick={() => seekTo(currentTime + 10)}
                  className="tv-focusable w-14 h-14 rounded-full bg-card/40 flex items-center justify-center">
                  <SkipForward className="w-7 h-7 text-foreground" />
                </button>
              )}
            </div>

            {/* Bottom bar */}
            <div className="p-4 bg-gradient-to-t from-background/80 to-transparent space-y-3 pointer-events-auto">
              {/* Progress bar - only for VOD */}
              {!isLive && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-14 text-right font-mono">{formatTime(currentTime)}</span>
                  <div
                    ref={progressBarRef}
                    className="flex-1 h-3 bg-secondary/60 rounded-full cursor-pointer relative group"
                    onMouseDown={handleProgressMouseDown}
                    onTouchStart={handleProgressTouchStart}
                  >
                    <div
                      className="h-full bg-primary rounded-full relative"
                      style={{ width: `${Math.min(progressPct, 100)}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary border-2 border-primary-foreground shadow-lg transform translate-x-1/2" />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-14 font-mono">{formatTime(duration)}</span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-center gap-4">
                <button data-focusable onClick={() => { setMuted(!muted); if (videoRef.current) videoRef.current.muted = !muted; }}
                  className="tv-focusable w-10 h-10 rounded-full bg-card/60 flex items-center justify-center">
                  {muted ? <VolumeX className="w-5 h-5 text-foreground" /> : <Volume2 className="w-5 h-5 text-foreground" />}
                </button>
                <button data-focusable onClick={toggleFullscreen}
                  className="tv-focusable w-10 h-10 rounded-full bg-card/60 flex items-center justify-center">
                  <Maximize className="w-5 h-5 text-foreground" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Share URL modal */}
      <AnimatePresence>
        {shareUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-background/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShareUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-card border border-border rounded-2xl p-5 max-w-sm w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold text-primary tracking-wider">COMPARTILHAR</h3>
                <button onClick={() => setShareUrl(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-muted-foreground text-xs">Link válido por 24h. Quem acessar poderá escolher assistir no navegador ou abrir o app.</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-xs font-mono truncate"
                />
                <button
                  onClick={copyShareUrl}
                  className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VideoPlayer;
