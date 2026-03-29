import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tv } from "lucide-react";
import { playSplashSound } from "@/lib/splashSound";

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Play sound
    playSplashSound();

    // Fallback interaction listener for autoplay policy
    const handleInteraction = () => {
      playSplashSound();
    };
    document.addEventListener("click", handleInteraction, { once: true });
    document.addEventListener("touchstart", handleInteraction, { once: true });
    document.addEventListener("keydown", handleInteraction, { once: true });

    const hideTimer = setTimeout(() => {
      setShow(false);
    }, 2800);

    const finishTimer = setTimeout(() => {
      onFinish();
    }, 3400);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(finishTimer);
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!show) {
    return (
      <div className="fixed inset-0 z-[100] bg-background animate-fade-out" style={{ animationDuration: "0.6s", animationFillMode: "forwards" }} />
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center overflow-hidden">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 0.3 }}
          animate={{ scale: 3 + i, opacity: 0 }}
          transition={{ duration: 2.5, delay: i * 0.3, ease: "easeOut" }}
          className="absolute w-40 h-40 rounded-full border border-primary/20"
        />
      ))}

      <div className="relative flex flex-col items-center gap-6">
        <motion.div
          initial={{ scale: 0, rotateY: -180 }}
          animate={{ scale: 1, rotateY: 0 }}
          transition={{ duration: 1, type: "spring", stiffness: 100 }}
          className="relative"
        >
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[0_0_60px_hsla(135,100%,50%,0.4)]">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="font-display text-5xl font-black text-primary-foreground"
            >
              T
            </motion.span>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: "spring" }}
            className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center"
          >
            <Tv className="w-4 h-4 text-accent-foreground" />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <h1 className="font-display text-3xl font-bold text-primary tracking-[0.3em]">
            THAYSON TV
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-muted-foreground text-sm mt-2 tracking-wider"
          >
            ENTRETENIMENTO DE ELITE
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "12rem" }}
          transition={{ delay: 1, duration: 1.5, ease: "easeInOut" }}
          className="h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
        />
      </div>
    </div>
  );
};

export default SplashScreen;
