import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { onInstallAvailability, promptInstall, isStandalone } from "@/lib/pwa";

const DISMISS_KEY = "thayson_pwa_install_dismissed_at";
const DISMISS_TTL = 1000 * 60 * 60 * 24 * 3; // 3 days

const PwaInstallPrompt: React.FC = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() - dismissedAt < DISMISS_TTL) return;

    const off = onInstallAvailability((available) => {
      setCanInstall(available);
      if (available) setTimeout(() => setVisible(true), 1500);
    });
    return () => {
      off();
    };
  }, []);

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome !== "unavailable") setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && canInstall && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 24 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] w-[min(92vw,420px)]"
        >
          <div className="relative rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-md p-4 shadow-[0_10px_40px_hsla(135,100%,50%,0.25)]">
            <button
              onClick={handleDismiss}
              aria-label="Fechar"
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-secondary/60 flex items-center justify-center hover:bg-secondary"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-3 pr-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[0_0_20px_hsla(135,100%,50%,0.4)]">
                <Smartphone className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-bold text-foreground tracking-wider">INSTALAR THAYSON TV</p>
                <p className="text-muted-foreground text-xs mt-0.5">Tela cheia, sem barras. Modo cinema 24/7.</p>
              </div>
            </div>
            <button
              onClick={handleInstall}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-[0_4px_16px_hsla(135,100%,50%,0.35)] hover:shadow-[0_6px_24px_hsla(135,100%,50%,0.45)] transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              Instalar agora
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PwaInstallPrompt;
