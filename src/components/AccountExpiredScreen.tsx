import React from "react";
import { motion } from "framer-motion";
import { Clock, Tv } from "lucide-react";
import SupportChat from "@/components/SupportChat";

const AccountExpiredScreen: React.FC = () => {
  return (
    <>
      <div className="h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md space-y-6"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/10 border border-accent/20">
            <Clock className="w-10 h-10 text-accent" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Tv className="w-6 h-6 text-primary" />
              <h1 className="font-display text-xl font-bold text-primary tracking-wider">THAYSON TV</h1>
            </div>
            <h2 className="text-foreground text-lg font-semibold">Conta Expirada</h2>
            <p className="text-muted-foreground text-sm">
              Seu tempo de acesso expirou. Entre em contato com o administrador para renovar.
            </p>
          </div>
        </motion.div>
      </div>
      <SupportChat />
    </>
  );
};

export default AccountExpiredScreen;
