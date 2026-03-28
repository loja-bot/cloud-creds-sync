import React from "react";
import { motion } from "framer-motion";
import { Tv, Radio, Film, Clapperboard, Heart, LogOut } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

const navItems = [
  { id: "home" as const, label: "Início", icon: Tv },
  { id: "live" as const, label: "Ao Vivo", icon: Radio },
  { id: "movies" as const, label: "Filmes", icon: Film },
  { id: "series" as const, label: "Séries", icon: Clapperboard },
  { id: "favorites" as const, label: "Favoritos", icon: Heart },
];

const Sidebar: React.FC = () => {
  const { section, navigate, expiresAt, appUser, signOut } = useApp();

  const formatExpiry = (d: string | null) => {
    if (!d) return null;
    try {
      return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return null; }
  };

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5 }}
      className="w-[220px] min-w-[220px] h-screen flex flex-col border-r border-border/50"
      style={{ background: "var(--gradient-surface)" }}
    >
      {/* Logo + User */}
      <div className="p-5 pt-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center border border-primary/20">
            <Tv className="w-5 h-5 text-primary" />
          </div>
          <span className="font-display text-sm font-bold text-primary tracking-widest">THAYSON</span>
        </div>
        {appUser && (
          <p className="text-muted-foreground text-[10px] mt-2 truncate">
            {appUser.display_name || appUser.email}
          </p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4 space-y-1">
        {navItems.map((item) => {
          const active = section === item.id;
          return (
            <button
              key={item.id}
              data-focusable
              onClick={() => navigate(item.id)}
              className={`tv-focusable w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/50 space-y-2">
        {expiresAt && (
          <p className="text-[10px] text-muted-foreground text-center">
            Playlist: {formatExpiry(expiresAt) || expiresAt}
          </p>
        )}
        {appUser?.account_expires_at && !appUser.is_permanent && (
          <p className="text-[10px] text-muted-foreground text-center">
            Conta: {formatExpiry(appUser.account_expires_at)}
          </p>
        )}
        {appUser?.is_permanent && (
          <p className="text-[10px] text-primary text-center">Conta Permanente ✓</p>
        )}
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut className="w-3 h-3" />
          Sair
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
