import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Download, Shield, Tv, Film, Radio, Clapperboard, ChevronLeft, ChevronRight, Loader2, Send } from "lucide-react";

interface Review {
  id: string;
  name: string;
  avatar_url: string | null;
  rating: number;
  comment: string;
  created_at: string;
}

const SCREENSHOTS = [
  { src: "/screenshots/login.jpg", label: "Login Seguro" },
  { src: "/screenshots/home.jpg", label: "Tela Inicial" },
  { src: "/screenshots/movies.jpg", label: "Filmes em HD" },
  { src: "/screenshots/series.jpg", label: "Séries Completas" },
  { src: "/screenshots/live.jpg", label: "Canais ao Vivo" },
  { src: "/screenshots/player.jpg", label: "Reprodução Premium" },
];

const InstallPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [valid, setValid] = useState<boolean | null>(null);
  const [appLink, setAppLink] = useState("/");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(4.8);
  const [screenshotIdx, setScreenshotIdx] = useState(0);
  const [reviewName, setReviewName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!token) { setValid(false); return; }
      const { data } = await supabase
        .from("install_tokens")
        .select("*")
        .eq("token", token)
        .maybeSingle();
      
      if (!data || new Date(data.expires_at) < new Date()) {
        setValid(false);
        return;
      }
      setValid(true);

      // Fetch app link
      const { data: setting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "app_link")
        .maybeSingle();
      if (setting?.value) {
        const val = typeof setting.value === "string" ? setting.value : (setting.value as any).url || "/";
        setAppLink(val);
      }
    };
    check();
  }, [token]);

  useEffect(() => {
    const fetchReviews = async () => {
      const { data } = await supabase
        .from("install_reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data && data.length) {
        setReviews(data as Review[]);
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setAvgRating(Math.round(avg * 10) / 10);
      }
    };
    fetchReviews();
  }, [submitted]);

  const handleSubmitReview = async () => {
    if (!reviewName.trim() || !reviewComment.trim()) return;
    setSubmitting(true);
    await supabase.from("install_reviews").insert({
      name: reviewName.trim(),
      comment: reviewComment.trim(),
      rating: reviewRating,
    });
    setSubmitting(false);
    setSubmitted(true);
    setReviewName("");
    setReviewComment("");
    setReviewRating(5);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleInstall = () => {
    if (appLink && appLink !== "/") window.open(appLink, "_blank", "noopener");
    else window.location.href = "/";
  };

  // Auto rotate screenshots
  useEffect(() => {
    const iv = setInterval(() => setScreenshotIdx(i => (i + 1) % SCREENSHOTS.length), 4000);
    return () => clearInterval(iv);
  }, []);

  if (valid === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="font-display text-xl font-bold text-foreground">Link Expirado</h1>
          <p className="text-muted-foreground text-sm">Este link de instalação expirou ou é inválido.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* Hero with 3D perspective */}
      <div className="relative overflow-hidden" style={{ perspective: "1200px" }}>
        {/* Animated bg gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px]" />

        <div className="relative z-10 pt-12 pb-8 px-4 text-center space-y-6 max-w-lg mx-auto">
          {/* App Icon with 3D effect */}
          <motion.div
            initial={{ rotateX: 30, opacity: 0, y: 30 }}
            animate={{ rotateX: 0, opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex justify-center"
          >
            <div className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center shadow-[0_8px_40px_hsla(135,100%,50%,0.4),0_0_0_1px_hsla(135,100%,50%,0.2)]"
              style={{ transform: "translateZ(30px)" }}>
              <span className="font-display text-5xl font-black text-primary-foreground">T</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="font-display text-2xl font-bold text-foreground tracking-wider">THAYSON TV</h1>
            <p className="text-primary text-sm font-semibold mt-1">ENTRETENIMENTO DE ELITE</p>
          </motion.div>

          {/* Rating & Info */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span className="text-foreground font-bold">{avgRating}</span>
              <span className="text-muted-foreground">({reviews.length})</span>
            </div>
            <div className="text-muted-foreground">
              <span className="text-foreground font-semibold">12 MB</span> • Streaming
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Shield className="w-3 h-3" />
              <span className="text-xs">Seguro</span>
            </div>
          </motion.div>

          {/* Install button */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
            <button
              onClick={handleInstall}
              className="w-full max-w-xs mx-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-[0_4px_20px_hsla(135,100%,50%,0.4)] hover:shadow-[0_6px_30px_hsla(135,100%,50%,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-5 h-5" />
              Instalar
            </button>
          </motion.div>
        </div>
      </div>

      {/* Screenshots carousel */}
      <div className="px-4 pb-8 max-w-lg mx-auto">
        <div className="relative">
          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card aspect-[9/16] relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={screenshotIdx}
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0"
              >
                <img
                  src={SCREENSHOTS[screenshotIdx].src}
                  alt={SCREENSHOTS[screenshotIdx].label}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg";
                  }}
                />
                {/* Overlay label band */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent p-4 pt-12">
                  <p className="text-foreground font-bold text-lg text-center">{SCREENSHOTS[screenshotIdx].label}</p>
                  <p className="text-primary text-xs text-center font-semibold mt-1">Somente aqui • Melhor qualidade</p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Nav arrows */}
            <button
              onClick={() => setScreenshotIdx(i => (i - 1 + SCREENSHOTS.length) % SCREENSHOTS.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center z-10"
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            <button
              onClick={() => setScreenshotIdx(i => (i + 1) % SCREENSHOTS.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center z-10"
            >
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {SCREENSHOTS.map((_, i) => (
              <button
                key={i}
                onClick={() => setScreenshotIdx(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === screenshotIdx ? "bg-primary w-6" : "bg-muted-foreground/30"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-4 pb-8 max-w-lg mx-auto">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Film, label: "Filmes HD", desc: "Catálogo completo" },
            { icon: Clapperboard, label: "Séries", desc: "Temporadas inteiras" },
            { icon: Radio, label: "Ao Vivo", desc: "Canais 24h" },
          ].map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="bg-card border border-border/50 rounded-xl p-4 text-center space-y-2"
            >
              <f.icon className="w-6 h-6 text-primary mx-auto" />
              <p className="text-foreground text-sm font-bold">{f.label}</p>
              <p className="text-muted-foreground text-[10px]">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Reviews section */}
      <div className="px-4 pb-8 max-w-lg mx-auto space-y-4">
        <h2 className="font-display text-sm font-bold text-foreground tracking-wider">AVALIAÇÕES</h2>

        {/* Submit review */}
        <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setReviewRating(s)}>
                <Star className={`w-5 h-5 transition-colors ${s <= reviewRating ? "text-primary fill-primary" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Seu nome"
            value={reviewName}
            onChange={(e) => setReviewName(e.target.value)}
            className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
          <textarea
            placeholder="O que achou do app?"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
          />
          <button
            onClick={handleSubmitReview}
            disabled={submitting || !reviewName.trim() || !reviewComment.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 transition-all"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {submitted ? "Enviado! ✓" : "Enviar Avaliação"}
          </button>
        </div>

        {/* Reviews list */}
        <div className="space-y-3">
          {reviews.map(review => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border/50 rounded-xl p-4 space-y-2"
            >
              <div className="flex items-center gap-3">
                {review.avatar_url ? (
                  <img src={review.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">{review.name.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-semibold truncate">{review.name}</p>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-3 h-3 ${s <= review.rating ? "text-primary fill-primary" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                </div>
                <span className="text-muted-foreground text-[10px]">
                  {new Date(review.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <p className="text-muted-foreground text-sm">{review.comment}</p>
            </motion.div>
          ))}
          {reviews.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">Seja o primeiro a avaliar!</p>
          )}
        </div>
      </div>

      {/* Fixed install bar */}
      <div className="sticky bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border/50 p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <span className="font-display text-lg font-black text-primary-foreground">T</span>
          </div>
          <div>
            <p className="text-foreground text-sm font-bold">THAYSON TV</p>
            <p className="text-muted-foreground text-[10px]">Grátis • 12 MB</p>
          </div>
        </div>
        <button
          onClick={handleInstall}
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-[0_2px_10px_hsla(135,100%,50%,0.3)] hover:shadow-[0_4px_20px_hsla(135,100%,50%,0.4)] transition-all"
        >
          Instalar
        </button>
      </div>
    </div>
  );
};

export default InstallPage;
