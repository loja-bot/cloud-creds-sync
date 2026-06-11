import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PopupConfig {
  enabled: boolean;
  title: string;
  message: string;
  color: string;
  interval_minutes: number;
}

const PopupNotifier: React.FC = () => {
  const [config, setConfig] = useState<PopupConfig | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchConfig = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "popup_config")
        .maybeSingle();
      if (!mounted) return;
      const v = data?.value as Partial<PopupConfig> | null;
      if (v && v.enabled && v.message) {
        setConfig({
          enabled: !!v.enabled,
          title: v.title || "Aviso",
          message: v.message || "",
          color: v.color || "#3B82F6",
          interval_minutes: Math.max(1, Number(v.interval_minutes) || 10),
        });
      } else {
        setConfig(null);
      }
    };
    fetchConfig();

    const channel = supabase
      .channel("popup-config-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, (payload) => {
        const key = (payload.new as { key?: string } | null)?.key;
        if (key === "popup_config") fetchConfig();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!config) { setOpen(false); return; }
    // show once shortly after load, then on interval
    const initial = setTimeout(() => setOpen(true), 4000);
    const id = setInterval(() => setOpen(true), config.interval_minutes * 60_000);
    return () => { clearTimeout(initial); clearInterval(id); };
  }, [config]);

  if (!config) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-[100] max-w-xs sm:max-w-sm rounded-2xl shadow-2xl border overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)`,
            borderColor: `${config.color}66`,
          }}
        >
          <div className="p-4 pr-10 text-white">
            <div className="flex items-center gap-2 mb-1.5">
              <Megaphone className="w-4 h-4" />
              <h4 className="font-bold text-sm tracking-wide">{config.title}</h4>
            </div>
            <p className="text-sm leading-snug opacity-95 whitespace-pre-wrap">{config.message}</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="absolute top-2 right-2 p-1 rounded-md hover:bg-white/20 text-white"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PopupNotifier;
