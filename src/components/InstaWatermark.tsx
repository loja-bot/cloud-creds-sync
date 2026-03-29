import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, UserPlus, Instagram } from "lucide-react";

const HANDLE = "7p_thayson";
const INSTA_URL = "https://www.instagram.com/7p_thayson/";
const SHOW_DURATION = 8000;
const INTERVAL = 60000;

const InstaWatermark: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [liked, setLiked] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const followBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const show = () => {
      setVisible(true);
      setLiked(false);
      setFollowed(false);
      setTimeout(() => setVisible(false), SHOW_DURATION);
    };

    const interval = setInterval(show, INTERVAL);
    const firstTimeout = setTimeout(show, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(firstTimeout);
    };
  }, []);

  const handleLike = () => {
    if (liked) return;
    setLiked(true);
    setHeartBurst(true);
    setConfetti(true);
    setTimeout(() => setHeartBurst(false), 600);
    setTimeout(() => setConfetti(false), 1000);
  };

  const handleFollow = () => {
    setFollowed(true);
    setConfetti(true);
    setTimeout(() => setConfetti(false), 1000);
    // Redirect to Instagram after animation
    setTimeout(() => {
      window.open(INSTA_URL, "_blank", "noopener,noreferrer");
    }, 400);
  };

  const letters = `@${HANDLE}`.split("");

  // Confetti particles
  const confettiColors = ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff", "#5f27cd"];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 pointer-events-auto"
        >
          <motion.div
            className="flex items-center gap-2 bg-background/80 backdrop-blur-md border border-border/50 rounded-xl px-3 py-2 shadow-lg"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <motion.div
              className="relative w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-[2px] flex-shrink-0"
              initial={{ rotate: -10 }}
              animate={{ rotate: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                <Instagram className="w-4 h-4 text-pink-500" />
              </div>
            </motion.div>

            <div className="flex items-center">
              {letters.map((letter, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: -8, scale: 0.5 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: 0.4 + i * 0.06,
                    type: "spring",
                    stiffness: 300,
                    damping: 12,
                  }}
                  className="text-[11px] font-semibold text-foreground"
                >
                  {letter}
                </motion.span>
              ))}
            </div>

            <motion.button
              onClick={handleLike}
              whileTap={{ scale: 0.8 }}
              className="relative ml-1 p-1 rounded-full hover:bg-muted/50 transition-colors overflow-visible"
            >
              <motion.div
                animate={liked ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 0.4 }}
              >
                <Heart
                  className={`w-3.5 h-3.5 transition-colors duration-300 ${
                    liked ? "text-red-500 fill-red-500" : "text-muted-foreground"
                  }`}
                />
              </motion.div>
              <AnimatePresence>
                {heartBurst && (
                  <>
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                        animate={{
                          scale: [0, 1, 0],
                          x: Math.cos((i * 60 * Math.PI) / 180) * 16,
                          y: Math.sin((i * 60 * Math.PI) / 180) * 16,
                          opacity: [1, 1, 0],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full bg-red-500"
                      />
                    ))}
                  </>
                )}
              </AnimatePresence>
            </motion.button>

            <motion.button
              ref={followBtnRef}
              onClick={handleFollow}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all duration-300 ${
                followed
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              <UserPlus className="w-2.5 h-2.5" />
              <motion.span
                animate={followed ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {followed ? "Seguindo" : "Seguir"}
              </motion.span>
              {/* Glow effect on follow */}
              <AnimatePresence>
                {followed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: [0, 0.6, 0], scale: [0.5, 1.8, 2.5] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 rounded-md bg-primary/30 pointer-events-none"
                  />
                )}
              </AnimatePresence>
            </motion.button>

            {/* Confetti burst */}
            <AnimatePresence>
              {confetti && (
                <>
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={`confetti-${i}`}
                      initial={{ scale: 0, x: 0, y: 0, opacity: 1, rotate: 0 }}
                      animate={{
                        scale: [0, 1, 0.5],
                        x: Math.cos((i * 30 * Math.PI) / 180) * (25 + Math.random() * 15),
                        y: Math.sin((i * 30 * Math.PI) / 180) * (25 + Math.random() * 15) - 10,
                        opacity: [1, 1, 0],
                        rotate: Math.random() * 360,
                      }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="absolute top-1/2 left-1/2 pointer-events-none"
                      style={{
                        width: Math.random() > 0.5 ? 4 : 3,
                        height: Math.random() > 0.5 ? 4 : 6,
                        backgroundColor: confettiColors[i % confettiColors.length],
                        borderRadius: Math.random() > 0.5 ? "50%" : "1px",
                      }}
                    />
                  ))}
                </>
              )}
            </AnimatePresence>

            {/* Animated hand pointing to follow button */}
            <motion.div
              initial={{ opacity: 0, x: -30, y: 10 }}
              animate={{
                opacity: [0, 1, 1, 1, 1, 0],
                x: [-30, 0, 0, 2, 0, 0],
                y: [10, 0, 0, -3, 0, -5],
                scale: [1, 1, 1, 0.9, 1, 1],
              }}
              transition={{ delay: 1.5, duration: 2.5, times: [0, 0.2, 0.4, 0.5, 0.6, 1] }}
              className="absolute -right-2 -bottom-3 text-xs pointer-events-none"
            >
              👆
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstaWatermark;
