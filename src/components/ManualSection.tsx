import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Play, Pause, Volume2, VolumeX, Radio, Film, Clapperboard, Heart, Tv, Shield, Sparkles } from "lucide-react";
import manual from "../../public/videos/manual-tutorial.mp4.asset.json";

const STEPS = [
  { icon: Tv, title: "1. Tela Inicial", desc: "Acesse a aba Início para ver o destaque ao vivo, continuar assistindo e seus favoritos." },
  { icon: Radio, title: "2. Canais Ao Vivo", desc: "Aba Ao Vivo lista todos os canais. Toque em um canal para iniciar a transmissão." },
  { icon: Film, title: "3. Filmes (VOD)", desc: "Catálogo completo de filmes. Use a busca e filtros por categoria." },
  { icon: Clapperboard, title: "4. Séries", desc: "Navegue por temporadas e episódios. O app salva seu progresso automaticamente." },
  { icon: Heart, title: "5. Favoritos", desc: "Toque no coração em qualquer conteúdo para salvar nos favoritos." },
  { icon: Shield, title: "6. Verificação de Idade", desc: "Conteúdos +18 exigem verificação. Faça uma vez e está liberado." },
  { icon: Sparkles, title: "7. Suporte", desc: "Ícone de chat no canto fala com o suporte humano direto pelo app." },
];

const ManualSection: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };
  const toggleMute = () => {
    const v = videoRef.current; if (!v) return;
    v.muted = !v.muted; setMuted(v.muted);
  };

  return (
    <div className="h-full overflow-y-auto hide-scrollbar p-6 space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" />
        <h1 className="font-display text-lg font-bold text-foreground tracking-wider">MANUAL DO APP</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative aspect-video rounded-2xl overflow-hidden border border-primary/30 bg-card shadow-[0_20px_60px_-20px_hsla(135,100%,50%,0.45)]"
      >
        <video
          ref={videoRef}
          src={manual.url}
          autoPlay
          muted
          loop
          playsInline
          // @ts-ignore
          webkit-playsinline="true"
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div>
            <p className="font-display text-xs tracking-[0.3em] text-primary">TUTORIAL</p>
            <p className="text-foreground font-bold text-sm">Como usar o Thayson TV</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-primary/20 hover:bg-primary/30 backdrop-blur flex items-center justify-center text-primary border border-primary/30"
              aria-label={playing ? "Pausar" : "Tocar"}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleMute}
              className="w-9 h-9 rounded-full bg-primary/20 hover:bg-primary/30 backdrop-blur flex items-center justify-center text-primary border border-primary/30"
              aria-label={muted ? "Ativar som" : "Mutar"}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-3 p-4 rounded-xl bg-card/80 backdrop-blur border border-border hover:border-primary/40 transition-all"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <s.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-foreground">{s.title}</p>
              <p className="text-muted-foreground text-xs mt-1 leading-relaxed">{s.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
        <p className="text-muted-foreground text-xs">
          Precisa de ajuda? Toque no ícone de <span className="text-primary font-semibold">chat</span> no canto da tela para falar com o suporte.
        </p>
      </div>
    </div>
  );
};

export default ManualSection;
