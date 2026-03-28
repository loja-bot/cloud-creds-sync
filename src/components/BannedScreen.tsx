import React from "react";
import { motion } from "framer-motion";
import { ShieldX, Tv } from "lucide-react";

interface BannedScreenProps {
  reason?: string | null;
}

const BannedScreen: React.FC<BannedScreenProps> = ({ reason }) => {
  return (
    <div className="h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md space-y-6"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-destructive/10 border border-destructive/20">
          <ShieldX className="w-10 h-10 text-destructive" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Tv className="w-6 h-6 text-primary" />
            <h1 className="font-display text-xl font-bold text-primary tracking-wider">THAYSON TV</h1>
          </div>
          <h2 className="text-foreground text-lg font-semibold">Conta Bloqueada</h2>
          <p className="text-muted-foreground text-sm">
            {reason || "Sua conta foi suspensa. Entre em contato com o administrador."}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default BannedScreen;
