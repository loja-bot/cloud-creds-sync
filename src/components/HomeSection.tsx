import React, { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { getContinueWatching, getFavorites, type ContinueItem, type FavoriteItem } from "@/lib/storage";
import { buildStreamUrl } from "@/lib/xtream";
import ContentCard from "./ContentCard";
import VideoBackground from "./VideoBackground";
import Logos3D from "./Logos3D";
import TvWall from "./TvWall";
import tv3d from "@/assets/logos/tv3d.png";
import play3d from "@/assets/logos/play3d.png";
import { motion } from "framer-motion";
import { Clock, Heart, Tv, Radio, Film, Clapperboard } from "lucide-react";
import homeBg from "../../public/videos/home-bg.mp4.asset.json";

const HomeSection: React.FC = () => {
  const { credentials, navigate, openPlayer } = useApp();
  const [continueItems, setContinueItems] = useState<ContinueItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    setContinueItems(getContinueWatching());
    setFavorites(getFavorites());
  }, []);

  const handlePlayContinue = (item: ContinueItem) => {
    if (!credentials) return;
    // Use stored extension or default based on type
    const ext = item.extension || (item.type === "live" ? "ts" : "mp4");
    const url = buildStreamUrl(credentials, item.id, item.type, ext);
    openPlayer({
      url,
      title: item.name,
      type: item.type,
      streamId: item.id,
      extension: ext,
      episodeId: item.episodeId,
      seasonNum: item.seasonNum,
      episodeNum: item.episodeNum,
    });
  };

  const handlePlayFavorite = (item: FavoriteItem) => {
    if (!credentials) return;
    const ext = item.type === "live" ? "ts" : "mp4";
    const url = buildStreamUrl(credentials, item.id, item.type, ext);
    openPlayer({ url, title: item.name, type: item.type, streamId: item.id, extension: ext });
  };

  const quickLinks = [
    { id: "live" as const, label: "Ao Vivo", icon: Radio, desc: "Canais de TV" },
    { id: "movies" as const, label: "Filmes", icon: Film, desc: "Catálogo VOD" },
    { id: "series" as const, label: "Séries", icon: Clapperboard, desc: "Séries completas" },
    { id: "favorites" as const, label: "Favoritos", icon: Heart, desc: "Seus salvos" },
  ];

  return (
    <div className="relative h-full overflow-y-auto hide-scrollbar p-6 space-y-8">
      <VideoBackground src={homeBg.url} opacity={0.28} />
      <Logos3D count={22} density={0.32} />
      <div className="relative z-10 space-y-8">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <motion.img
          src={tv3d}
          alt=""
          loading="lazy"
          width={96}
          height={96}
          className="w-20 h-20 md:w-24 md:h-24 object-contain"
          style={{ filter: "drop-shadow(0 0 24px hsla(135,100%,50%,0.55))" }}
          animate={{ y: [0, -6, 0], rotate: [-3, 3, -3] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="space-y-1">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-primary tracking-wider">THAYSON TV</h1>
          <p className="text-muted-foreground text-sm">Bem-vindo ao seu centro de entretenimento</p>
        </div>
      </motion.div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickLinks.map((link, i) => (
          <motion.button
            key={link.id}
            data-focusable
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.03, y: -2 }}
            onClick={() => navigate(link.id)}
            className="tv-focusable relative overflow-hidden p-4 rounded-xl bg-card/80 backdrop-blur-sm border border-border hover:border-primary/50 transition-all text-left space-y-2 group"
          >
            <img
              src={play3d}
              alt=""
              loading="lazy"
              className="absolute -right-3 -bottom-3 w-16 h-16 object-contain opacity-30 group-hover:opacity-70 transition-opacity"
              style={{ filter: "drop-shadow(0 0 14px hsla(135,100%,50%,0.6))" }}
            />
            <link.icon className="w-6 h-6 text-primary relative z-10" />
            <div className="relative z-10">
              <p className="text-foreground font-semibold text-sm">{link.label}</p>
              <p className="text-muted-foreground text-xs">{link.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* TV Wall — live channels showcase */}
      <TvWall />

      {/* Continue watching */}
      {continueItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="font-display text-sm font-bold text-foreground tracking-wider">CONTINUAR ASSISTINDO</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {continueItems.slice(0, 6).map((item) => (
              <div key={`${item.type}-${item.id}`} className="relative">
                <ContentCard
                  title={item.name}
                  image={item.icon || "/placeholder.svg"}
                  onClick={() => handlePlayContinue(item)}
                  aspectRatio="landscape"
                />
                {/* Progress indicator */}
                {item.progress && item.duration && item.duration > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary/60 rounded-b">
                    <div
                      className="h-full bg-primary rounded-b"
                      style={{ width: `${Math.min((item.progress / item.duration) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" />
            <h2 className="font-display text-sm font-bold text-foreground tracking-wider">FAVORITOS</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {favorites.slice(0, 6).map((item) => (
              <ContentCard
                key={`${item.type}-${item.id}`}
                title={item.name}
                image={item.icon || "/placeholder.svg"}
                onClick={() => handlePlayFavorite(item)}
              />
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default HomeSection;
