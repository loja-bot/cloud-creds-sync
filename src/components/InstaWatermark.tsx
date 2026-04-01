import React, { useEffect, useState, useRef, useCallback } from "react";
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
  const [likeGlow, setLikeGlow] = useState(false);
  const [followGlow, setFollowGlow] = useState(false);
  const followBtnRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fingerPos, setFingerPos] = useState({ x: 0, y: 0 });

  // Calculate finger position to be exactly over the follow button
  const updateFingerPos = useCallback(() => {
    if (followBtnRef.current && containerRef.current) {
      const btnRect = followBtnRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      setFingerPos({
        x: btnRect.left - containerRect.left + btnRect.width / 2 - 8,
        y: btnRect.top - containerRect.top + btnRect.height + 4,
      });
    }
  }, []);

  useEffect(() => {
    const show = () => {
      setVisible(true);
      setLiked(false);
      setFollowed(false);
      setTimeout(() => setVisible(false), SHOW_DURATION);
    };

    const interval = setInterval(show, INTERVAL);
    const firstTimeout = setTimeout(show, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(firstTimeout);
    };
  }, []);

  // Update finger position when visible
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(updateFingerPos, 1200);
      return () => clearTimeout(timer);
    }
  }, [visible, updateFingerPos]);

  const handleLike = () => {
    if (liked) return;
    setLiked(true);
    setHeartBurst(true);
    setLikeGlow(true);
    setConfetti(true);
    setTimeout(() => setHeartBurst(false), 600);
    setTimeout(() => setLikeGlow(false), 800);
    setTimeout(() => setConfetti(false), 1000);
  };

  const handleFollow = () => {
    if (followed) return;
    setFollowed(true);
    setFollowGlow(true);
    setConfetti(true);
    setTimeout(() => setFollowGlow(false), 800);
    setTimeout(() => setConfetti(false), 1000);
    setTimeout(() => {
      window.open(INSTA_URL, "_blank", "noopener,noreferrer");
    }, 500);
  };

  const letters = `@${HANDLE}`.split("");
  const confettiColors = ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff", "#5f27cd"];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed bottom-4 left-4 z-50 pointer-events-auto"
        >
          <motion.div
            ref={containerRef}
            className="relative flex items-center gap-2 bg-background/80 backdrop-blur-md border border-border/50 rounded-xl px-3 py-2 shadow-lg"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            {/* Instagram icon */}
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

            {/* Handle text */}
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

            {/* Like button */}
            <motion.button
              onClick={handleLike}
              whileTap={{ scale: 0.8 }}
              className="relative ml-1 p-1 rounded-full hover:bg-muted/50 transition-colors overflow-visible"
            >
              <motion.div
                animate={liked ? { scale: [1, 1.6, 1.2, 1.4, 1] } : {}}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <Heart
                  className={`w-3.5 h-3.5 transition-colors duration-300 ${
                    liked ? "text-red-500 fill-red-500" : "text-muted-foreground"
                  }`}
                />
              </motion.div>
              {/* Like glow ring */}
              <AnimatePresence>
                {likeGlow && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: [0, 0.9, 0], scale: [0.5, 2.5, 4] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7 }}
                    className="absolute inset-0 rounded-full bg-red-500/40 pointer-events-none"
                  />
                )}
              </AnimatePresence>
              {/* Heart burst particles */}
              <AnimatePresence>
                {heartBurst && (
                  <>
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                        animate={{
                          scale: [0, 1.2, 0],
                          x: Math.cos((i * 45 * Math.PI) / 180) * 20,
                          y: Math.sin((i * 45 * Math.PI) / 180) * 20,
                          opacity: [1, 1, 0],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute top-1/2 left-1/2 w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full"
                        style={{ backgroundColor: i % 2 === 0 ? "#ef4444" : "#fbbf24" }}
                      />
                    ))}
                  </>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Follow button */}
            <motion.button
              ref={followBtnRef}
              onClick={handleFollow}
              whileTap={{ scale: 0.85 }}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 }}
              className={`relative flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all duration-300 overflow-visible ${
                followed
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              <UserPlus className="w-2.5 h-2.5" />
              <motion.span
                animate={followed ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {followed ? "Seguindo" : "Seguir"}
              </motion.span>
              {/* Follow glow ring */}
              <AnimatePresence>
                {followGlow && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: [0, 0.9, 0], scale: [0.5, 2.5, 3.5] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 rounded-md bg-primary/50 pointer-events-none"
                  />
                )}
              </AnimatePresence>
            </motion.button>

            {/* Confetti burst */}
            <AnimatePresence>
              {confetti && (
                <>
                  {[...Array(16)].map((_, i) => (
                    <motion.div
                      key={`confetti-${i}`}
                      initial={{ scale: 0, x: 0, y: 0, opacity: 1, rotate: 0 }}
                      animate={{
                        scale: [0, 1, 0.5],
                        x: Math.cos((i * 22.5 * Math.PI) / 180) * (30 + Math.random() * 20),
                        y: Math.sin((i * 22.5 * Math.PI) / 180) * (30 + Math.random() * 20) - 10,
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

            {/* Animated hand pointing directly at follow button */}
            {!followed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 0, 1, 1, 1, 1, 0.8, 0],
                  y: [8, 8, 0, 0, -3, 0, 0, 8],
                  scale: [0.7, 0.7, 1, 1, 0.85, 1.05, 1, 0.7],
                }}
                transition={{
                  delay: 1.5,
                  duration: 3,
                  times: [0, 0.05, 0.15, 0.4, 0.55, 0.65, 0.85, 1],
                  repeat: Infinity,
                  repeatDelay: 1,
                }}
                className="absolute pointer-events-none"
                style={{
                  left: fingerPos.x > 0 ? `${fingerPos.x}px` : "calc(100% - 32px)",
                  top: fingerPos.x > 0 ? `${fingerPos.y}px` : "calc(100% + 4px)",
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                  fontSize: "18px",
                  zIndex: 100,
                }}
              >
                👆
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstaWatermark;
