import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, UserPlus, Instagram } from "lucide-react";

const HANDLE = "7p_thayson";
const SHOW_DURATION = 8000; // 8s visible
const INTERVAL = 60000; // 1 min

const InstaWatermark: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [liked, setLiked] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);

  useEffect(() => {
    // Show first time after 60s, then every 60s
    const show = () => {
      setVisible(true);
      setLiked(false);
      setFollowed(false);
      setTimeout(() => setVisible(false), SHOW_DURATION);
    };

    const interval = setInterval(show, INTERVAL);
    // First appearance after 30s
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
    setTimeout(() => setHeartBurst(false), 600);
  };

  const handleFollow = () => {
    setFollowed(true);
  };

  const letters = `@${HANDLE}`.split("");

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
          {/* Glass card */}
          <motion.div
            className="flex items-center gap-2 bg-background/80 backdrop-blur-md border border-border/50 rounded-xl px-3 py-2 shadow-lg"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            {/* Profile pic */}
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

            {/* Handle with letter-by-letter animation */}
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
              className="relative ml-1 p-1 rounded-full hover:bg-muted/50 transition-colors"
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

              {/* Heart burst particles */}
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

            {/* Follow button */}
            <motion.button
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
            </motion.button>

            {/* Animated hand cursor on first appear */}
            <motion.div
              initial={{ opacity: 0, x: -20, y: 10 }}
              animate={{
                opacity: [0, 1, 1, 1, 0],
                x: [-20, 0, 0, 0, 10],
                y: [10, 0, -2, 0, -10],
              }}
              transition={{ delay: 1.5, duration: 2, times: [0, 0.2, 0.4, 0.6, 1] }}
              className="absolute -right-1 -bottom-1 text-[10px] pointer-events-none"
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
