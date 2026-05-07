import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tv } from "lucide-react";
import { playSplashSound } from "@/lib/splashSound";
import introHero from "../../public/videos/intro-hero-v2.mp4.asset.json";

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [phase, setPhase] = useState<"video" | "brand" | "done">("video");
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const finishedRef = useRef(false);

  // Try to play the video as soon as possible (mobile autoplay needs muted+playsInline)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    const tryPlay = () => {
      const p = v.play();
      if (p && typeof p.then === "function") {
        p.catch(() => {
          // Will retry on user interaction
        });
      }
    };
    tryPlay();
    const onCanPlay = () => { setVideoReady(true); tryPlay(); };
    const onError = () => setVideoFailed(true);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("loadeddata", onCanPlay);
    v.addEventListener("error", onError);

    const userKick = () => tryPlay();
    document.addEventListener("touchstart", userKick, { once: true, passive: true });
    document.addEventListener("click", userKick, { once: true });

    return () => {
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("loadeddata", onCanPlay);
      v.removeEventListener("error", onError);
      document.removeEventListener("touchstart", userKick);
      document.removeEventListener("click", userKick);
    };
  }, []);

  useEffect(() => {
    const retry = () => { try { playSplashSound(); } catch {} };
    document.addEventListener("click", retry, { once: true });
    document.addEventListener("touchstart", retry, { once: true });
    document.addEventListener("keydown", retry, { once: true });

    // Phase 1: hero video (8.5s — let the longer cinematic play)
    const t1 = setTimeout(() => {
      try { playSplashSound(); } catch {}
      setPhase("brand");
    }, 8500);
    // Phase 2: brand (2.4s)
    const t2 = setTimeout(() => setPhase("done"), 10900);
    // Finish
    const t3 = setTimeout(() => {
      if (!finishedRef.current) { finishedRef.current = true; onFinish(); }
    }, 11500);
    // Safety
    const t4 = setTimeout(() => {
      if (!finishedRef.current) { finishedRef.current = true; onFinish(); }
    }, 13000);

    return () => {
      [t1, t2, t3, t4].forEach(clearTimeout);
      document.removeEventListener("click", retry);
      document.removeEventListener("touchstart", retry);
      document.removeEventListener("keydown", retry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "done") {
    return (
      <div
        className="fixed inset-0 z-[100] bg-background animate-fade-out"
        style={{ animationDuration: "0.6s", animationFillMode: "forwards" }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        {phase === "video" && (
          <motion.div
            key="video"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            {/* Animated gradient fallback so there is never a black screen on mobile */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, hsla(135,100%,50%,0.25), transparent 60%), radial-gradient(circle at 70% 70%, hsla(135,100%,40%,0.18), transparent 55%), #000",
              }}
            />
            <video
              ref={videoRef}
              src={introHero.url}
              autoPlay
              muted
              loop={false}
              playsInline
              // @ts-ignore
              webkit-playsinline="true"
              preload="auto"
              controls={false}
              disablePictureInPicture
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{
                opacity: videoReady && !videoFailed ? 1 : 0,
                filter: "saturate(1.25) contrast(1.08)",
              }}
            />
            {/* Loader while video buffers on mobile */}
            {!videoReady && !videoFailed && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  <p className="text-primary/80 text-xs tracking-[0.4em] font-display">CARREGANDO</p>
                </div>
              </div>
            )}
            {/* Cinematic letterbox bars */}
            <motion.div
              initial={{ height: "20%" }}
              animate={{ height: "8%" }}
              transition={{ duration: 1.2 }}
              className="absolute top-0 left-0 right-0 bg-background"
            />
            <motion.div
              initial={{ height: "20%" }}
              animate={{ height: "8%" }}
              transition={{ duration: 1.2 }}
              className="absolute bottom-0 left-0 right-0 bg-background"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/60" />
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="absolute bottom-[12%] left-0 right-0 text-center font-display text-xs tracking-[0.5em] text-primary"
            >
              UMA APRESENTAÇÃO THAYSON
            </motion.p>
          </motion.div>
        )}

        {phase === "brand" && (
          <motion.div
            key="brand"
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="relative flex flex-col items-center gap-6"
          >
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0.4 }}
                animate={{ scale: 3 + i, opacity: 0 }}
                transition={{ duration: 2, delay: i * 0.25, ease: "easeOut" }}
                className="absolute w-40 h-40 rounded-full border border-primary/30"
              />
            ))}

            <motion.div
              initial={{ scale: 0, rotateY: -180 }}
              animate={{ scale: 1, rotateY: 0 }}
              transition={{ duration: 0.9, type: "spring", stiffness: 110 }}
              className="relative"
            >
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[0_0_60px_hsla(135,100%,50%,0.5)]">
                <span className="font-display text-5xl font-black text-primary-foreground">T</span>
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
                className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center"
              >
                <Tv className="w-4 h-4 text-accent-foreground" />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <h1 className="font-display text-3xl font-bold text-primary tracking-[0.3em]">
                THAYSON TV
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-muted-foreground text-sm mt-2 tracking-wider"
              >
                ENTRETENIMENTO DE ELITE
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "12rem" }}
              transition={{ delay: 0.6, duration: 1.2, ease: "easeInOut" }}
              className="h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SplashScreen;
