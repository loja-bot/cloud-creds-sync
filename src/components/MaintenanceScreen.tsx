import React from "react";
import { motion } from "framer-motion";
import { Tv, Wrench, Loader2 } from "lucide-react";

interface MaintenanceScreenProps {
  message?: string;
}

const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ message }) => {
  return (
    <div className="h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md space-y-6"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20"
        >
          <Wrench className="w-10 h-10 text-primary" />
        </motion.div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Tv className="w-6 h-6 text-primary" />
            <h1 className="font-display text-xl font-bold text-primary tracking-wider">THAYSON TV</h1>
          </div>
          <h2 className="text-foreground text-lg font-semibold">Em Manutenção</h2>
          <p className="text-muted-foreground text-sm">
            {message || "Aguardando nova playlist. O serviço será restaurado automaticamente assim que uma nova playlist for enviada."}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Verificando atualizações...</span>
        </div>
      </motion.div>
    </div>
  );
};

export default MaintenanceScreen;
