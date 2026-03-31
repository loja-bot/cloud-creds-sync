import React, { useEffect, useState, useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { getVodCategories, getVodStreams, getVodInfo, buildStreamUrl, type Category, type VodStream } from "@/lib/xtream";
import { addFavorite, removeFavorite, isFavorite } from "@/lib/storage";
import { useBlockedContent } from "@/hooks/useBlockedContent";
import ContentCard from "./ContentCard";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Loader2, Play, X, Star, Search, AlertTriangle } from "lucide-react";

const MoviesSection: React.FC = () => {
  const { credentials, openPlayer } = useApp();
  const { isContentBlocked, isCategoryBlocked, getCategoryAction } = useBlockedContent();
  const [categories, setCategories] = useState<Category[]>([]);
  const [streams, setStreams] = useState<VodStream[]>([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!credentials) return;
    getVodCategories(credentials).then((cats) => {
      setCategories(cats || []);
      if (cats?.length) setSelectedCat(cats[0].category_id);
    }).catch(console.error);
  }, [credentials]);

  useEffect(() => {
    if (!credentials || !selectedCat) return;

    const catAction = getCategoryAction(selectedCat, "movies");
    if (catAction) {
      if (catAction.action === "removed" || catAction.action === "banned") {
        setStreams([]); setLoading(false); setWarningMsg(null); return;
      }
      if (catAction.action === "warning") {
        setWarningMsg(catAction.message || "Categoria indisponível."); setStreams([]); setLoading(false); return;
      }
      if (catAction.action === "maintenance") {
        setWarningMsg("Categoria em manutenção."); setStreams([]); setLoading(false); return;
      }
    } else { setWarningMsg(null); }

    setLoading(true);
    getVodStreams(credentials, selectedCat).then((s) => {
      setStreams((s || []).filter(v => !isContentBlocked(v.stream_id, "movies")));
    }).catch(console.error).finally(() => setLoading(false));
  }, [credentials, selectedCat, isContentBlocked, getCategoryAction]);

  const filteredStreams = useMemo(() => {
    if (!searchQuery.trim()) return streams;
    const q = searchQuery.toLowerCase();
    return streams.filter(v => v.name.toLowerCase().includes(q));
  }, [streams, searchQuery]);

  const visibleCategories = categories.filter(cat => {
    const action = getCategoryAction(cat.category_id, "movies");
    return !action || action.action === "warning" || action.action === "maintenance";
  });

  const showDetail = async (vod: VodStream) => {
    if (!credentials) return;
    setDetailLoading(true);
    setDetail({ ...vod, info: null });
    try {
      const info = await getVodInfo(credentials, vod.stream_id);
      setDetail({ ...vod, info: info?.info || null });
    } catch {}
    setDetailLoading(false);
  };

  const handlePlay = (vod: VodStream) => {
    if (!credentials) return;
    const url = buildStreamUrl(credentials, vod.stream_id, "movie", vod.container_extension || "mp4");
    openPlayer({ url, title: vod.name, type: "movie", streamId: vod.stream_id, extension: vod.container_extension });
  };

  const toggleFav = (vod: VodStream) => {
    if (isFavorite(vod.stream_id, "movie")) removeFavorite(vod.stream_id, "movie");
    else addFavorite({ id: vod.stream_id, type: "movie", name: vod.name, icon: vod.stream_icon, addedAt: Date.now() });
  };

  return (
    <div className="flex h-full relative">
      <div className="w-[200px] min-w-[200px] border-r border-border/50 overflow-y-auto hide-scrollbar p-3 space-y-1">
        <div className="flex items-center gap-2 px-3 py-2 mb-2">
          <Film className="w-4 h-4 text-primary" />
          <span className="font-display text-xs font-bold text-primary tracking-wider">FILMES</span>
        </div>
        {visibleCategories.map((cat) => (
          <button key={cat.category_id} data-focusable onClick={() => setSelectedCat(cat.category_id)}
            className={`tv-focusable w-full text-left px-3 py-2 rounded-lg text-xs transition-all truncate ${
              selectedCat === cat.category_id ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}>{cat.category_name}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Pesquisar filmes..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors" />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {warningMsg ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <AlertTriangle className="w-12 h-12 text-yellow-500" />
            <p className="text-foreground font-semibold text-center">{warningMsg}</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredStreams.map((vod) => (
              <ContentCard key={vod.stream_id} title={vod.name} image={vod.stream_icon || "/placeholder.svg"}
                rating={vod.rating} onClick={() => showDetail(vod)} onFavorite={() => toggleFav(vod)}
                isFavorite={isFavorite(vod.stream_id, "movie")} />
            ))}
          </div>
        )}
        {!loading && !warningMsg && filteredStreams.length === 0 && searchQuery && (
          <p className="text-center text-muted-foreground text-sm py-8">Nenhum filme encontrado para "{searchQuery}"</p>
        )}
      </div>

      <AnimatePresence>
        {detail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setDetail(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-card rounded-2xl border border-border max-w-2xl w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}>
              <div className="relative aspect-video">
                <img src={detail.stream_icon || "/placeholder.svg"} alt={detail.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                <button onClick={() => setDetail(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/60 flex items-center justify-center">
                  <X className="w-4 h-4 text-foreground" />
                </button>
              </div>
              <div className="p-5 -mt-16 relative">
                <h2 className="text-xl font-bold text-foreground mb-1">{detail.name}</h2>
                {detail.rating && (
                  <div className="flex items-center gap-1 mb-3">
                    <Star className="w-4 h-4 text-primary fill-primary" />
                    <span className="text-primary text-sm font-semibold">{detail.rating}</span>
                  </div>
                )}
                {detail.info?.plot && <p className="text-muted-foreground text-sm mb-3 line-clamp-3">{detail.info.plot}</p>}
                {detail.info?.cast && <p className="text-muted-foreground text-xs mb-4"><span className="text-foreground">Elenco:</span> {detail.info.cast}</p>}
                <button data-focusable onClick={() => { setDetail(null); handlePlay(detail); }}
                  className="tv-focusable flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:brightness-110 transition-all">
                  <Play className="w-5 h-5" /> Assistir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MoviesSection;
