import React from "react";
import { motion } from "framer-motion";
import { Construction } from "lucide-react";

interface ConstructionScreenProps {
  message?: string;
  color?: string;
  title?: string;
}

// Helper: pick readable text color against background
const isLight = (hex: string) => {
  try {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  } catch { return true; }
};

const ConstructionScreen: React.FC<ConstructionScreenProps> = ({
  message = "Servidor em construção. Voltamos em instantes!",
  color = "#FBBF24",
  title = "EM CONSTRUÇÃO",
}) => {
  const fg = isLight(color) ? "#1a1a1a" : "#ffffff";

  return (
    <div
      className="h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 50%, ${color}aa 100%)`,
        color: fg,
      }}
    >
      {/* Diagonal warning stripes */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 28px, ${fg} 28px, ${fg} 56px)`,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative text-center max-w-md space-y-6 z-10"
      >
        <motion.div
          animate={{ rotate: [-8, 8, -8], y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          className="text-7xl drop-shadow-lg"
          style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,.25))" }}
        >
          🚧
        </motion.div>

        <div className="space-y-3">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest"
            style={{ background: fg, color }}
          >
            <Construction className="w-3.5 h-3.5" />
            <span>{title}</span>
          </div>

          <h1
            className="font-display text-2xl sm:text-3xl font-black leading-tight"
            style={{ color: fg, textShadow: "0 2px 8px rgba(0,0,0,.15)" }}
          >
            {message}
          </h1>

          <p className="text-sm opacity-80" style={{ color: fg }}>
            Estamos trabalhando para melhorar sua experiência.
          </p>
        </div>

        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          className="text-xs font-mono tracking-widest"
          style={{ color: fg }}
        >
          ● ● ●
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ConstructionScreen;
