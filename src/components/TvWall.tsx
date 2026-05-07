import React from "react";
import { motion } from "framer-motion";
import cartoon from "../../public/videos/tv-cartoon.mp4.asset.json";
import movie from "../../public/videos/tv-movie.mp4.asset.json";
import soccer from "../../public/videos/tv-soccer.mp4.asset.json";
import game from "../../public/videos/tv-game.mp4.asset.json";
import news from "../../public/videos/tv-news.mp4.asset.json";
import anime from "../../public/videos/tv-anime.mp4.asset.json";
import music from "../../public/videos/tv-music.mp4.asset.json";
import series from "../../public/videos/tv-series.mp4.asset.json";

const TILES = [
  { src: cartoon.url, label: "DESENHOS" },
  { src: movie.url, label: "FILMES" },
  { src: soccer.url, label: "FUTEBOL" },
  { src: game.url, label: "GAMES" },
  { src: news.url, label: "NOTÍCIAS" },
  { src: anime.url, label: "ANIME" },
  { src: music.url, label: "MÚSICA" },
  { src: series.url, label: "SÉRIES" },
];

const TvWall: React.FC = () => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <h2 className="font-display text-sm font-bold text-foreground tracking-wider">
          AO VIVO • CANAIS EM DESTAQUE
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {TILES.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, y: 18, rotateX: -10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: i * 0.06, duration: 0.5 }}
            whileHover={{ scale: 1.04, rotateY: 4 }}
            className="relative aspect-video rounded-xl overflow-hidden border border-primary/20 bg-card shadow-[0_8px_30px_-10px_hsla(135,100%,50%,0.35)] group"
            style={{ perspective: "800px" }}
          >
            <video
              src={t.src}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent" />
            {/* CRT scanlines */}
            <div
              className="pointer-events-none absolute inset-0 opacity-25 mix-blend-overlay"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0px, rgba(0,0,0,0.15) 2px)",
              }}
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-destructive/90 text-destructive-foreground text-[10px] font-bold tracking-wider">
              ● LIVE
            </div>
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-foreground font-display text-xs font-bold tracking-wider">
                {t.label}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TvWall;
