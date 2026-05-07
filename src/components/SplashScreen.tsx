import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tv } from "lucide-react";
import { playSplashSound } from "@/lib/splashSound";
import introHero from "../../public/videos/intro-hero.mp4.asset.json";

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [phase, setPhase] = useState<"video" | "brand" | "done">("video");
  const finishedRef = useRef(false);

  useEffect(() => {
    const retry = () => { try { playSplashSound(); } catch {} };
    document.addEventListener("click", retry, { once: true });
    document.addEventListener("touchstart", retry, { once: true });
    document.addEventListener("keydown", retry, { once: true });

    // Phase 1: hero video (4.2s)
    const t1 = setTimeout(() => {
      try { playSplashSound(); } catch {}
      setPhase("brand");
    }, 4200);
    // Phase 2: brand (2.4s)
    const t2 = setTimeout(() => setPhase("done"), 6600);
    // Finish
    const t3 = setTimeout(() => {
      if (!finishedRef.current) { finishedRef.current = true; onFinish(); }
    }, 7200);
    // Safety
    const t4 = setTimeout(() => {
      if (!finishedRef.current) { finishedRef.current = true; onFinish(); }
    }, 9000);

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
            <video
              src={introHero.url}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "saturate(1.25) contrast(1.08)" }}
            />
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
