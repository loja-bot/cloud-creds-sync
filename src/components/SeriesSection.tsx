import React, { useEffect, useState, useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { getSeriesCategories, getSeries, getSeriesInfo, buildStreamUrl, type Category, type SeriesInfo } from "@/lib/xtream";
import { addFavorite, removeFavorite, isFavorite } from "@/lib/storage";
import ContentCard from "./ContentCard";
import { motion, AnimatePresence } from "framer-motion";
import { Clapperboard, Loader2, Play, X, Star, Search } from "lucide-react";

const SeriesSection: React.FC = () => {
  const { credentials, openPlayer } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesInfo[]>([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [seasons, setSeasons] = useState<any>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!credentials) return;
    getSeriesCategories(credentials).then((cats) => {
      setCategories(cats || []);
      if (cats?.length) setSelectedCat(cats[0].category_id);
    }).catch(console.error);
  }, [credentials]);

  useEffect(() => {
    if (!credentials || !selectedCat) return;
    setLoading(true);
    getSeries(credentials, selectedCat).then((s) => setSeriesList(s || [])).catch(console.error).finally(() => setLoading(false));
  }, [credentials, selectedCat]);

  const filteredSeries = useMemo(() => {
    if (!searchQuery.trim()) return seriesList;
    const q = searchQuery.toLowerCase();
    return seriesList.filter(s => s.name.toLowerCase().includes(q));
  }, [seriesList, searchQuery]);

  const showDetail = async (series: SeriesInfo) => {
    if (!credentials) return;
    setDetail(series);
    setSeasons(null);
    try {
      const info = await getSeriesInfo(credentials, series.series_id);
      if (info?.episodes) {
        setSeasons(info.episodes);
        const keys = Object.keys(info.episodes);
        if (keys.length) setSelectedSeason(keys[0]);
      }
      if (info?.info) setDetail((d: any) => ({ ...d, ...info.info }));
    } catch { }
  };

  const handlePlayEpisode = (episode: any) => {
    if (!credentials || !detail) return;
    const ext = episode.container_extension || "mp4";
    const url = buildStreamUrl(credentials, episode.id, "series", ext);
    openPlayer({
      url, title: `${detail.name} - S${episode.season || "?"}E${episode.episode_num || "?"}`,
      type: "series", streamId: episode.id, episodeId: episode.id,
      seasonNum: episode.season, episodeNum: episode.episode_num
    });
  };

  const toggleFav = (s: SeriesInfo) => {
    if (isFavorite(s.series_id, "series")) removeFavorite(s.series_id, "series");
    else addFavorite({ id: s.series_id, type: "series", name: s.name, icon: s.cover, addedAt: Date.now() });
  };

  return (
    <div className="flex h-full relative">
      <div className="w-[200px] min-w-[200px] border-r border-border/50 overflow-y-auto hide-scrollbar p-3 space-y-1">
        <div className="flex items-center gap-2 px-3 py-2 mb-2">
          <Clapperboard className="w-4 h-4 text-primary" />
          <span className="font-display text-xs font-bold text-primary tracking-wider">SÉRIES</span>
        </div>
        {categories.map((cat) => (
          <button key={cat.category_id} data-focusable onClick={() => setSelectedCat(cat.category_id)}
            className={`tv-focusable w-full text-left px-3 py-2 rounded-lg text-xs transition-all truncate ${
              selectedCat === cat.category_id ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}>{cat.category_name}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar p-4 space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Pesquisar séries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredSeries.map((s) => (
              <ContentCard key={s.series_id} title={s.name} image={s.cover || "/placeholder.svg"}
                rating={s.rating} onClick={() => showDetail(s)} onFavorite={() => toggleFav(s)}
                isFavorite={isFavorite(s.series_id, "series")} />
            ))}
          </div>
        )}
        {!loading && filteredSeries.length === 0 && searchQuery && (
          <p className="text-center text-muted-foreground text-sm py-8">Nenhuma série encontrada para "{searchQuery}"</p>
        )}
      </div>

      {/* Series detail */}
      <AnimatePresence>
        {detail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-background/95 backdrop-blur-sm overflow-y-auto hide-scrollbar p-6"
            onClick={() => { setDetail(null); setSeasons(null); }}>
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} exit={{ y: 20 }}
              className="bg-card rounded-2xl border border-border max-w-3xl mx-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}>
              <div className="relative aspect-[21/9]">
                <img src={detail.cover || detail.backdrop_path?.[0] || "/placeholder.svg"} alt={detail.name}
                  className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                <button onClick={() => { setDetail(null); setSeasons(null); }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/60 flex items-center justify-center">
                  <X className="w-4 h-4 text-foreground" />
                </button>
              </div>
              <div className="p-5 -mt-10 relative">
                <h2 className="text-xl font-bold text-foreground mb-1">{detail.name}</h2>
                {detail.rating && (
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-4 h-4 text-primary fill-primary" />
                    <span className="text-primary text-sm">{detail.rating}</span>
                  </div>
                )}
                {detail.plot && <p className="text-muted-foreground text-sm mb-2">{detail.plot}</p>}
                {detail.cast && <p className="text-muted-foreground text-xs mb-4"><span className="text-foreground">Elenco:</span> {detail.cast}</p>}
                {seasons && (
                  <div className="space-y-3">
                    <div className="flex gap-2 flex-wrap">
                      {Object.keys(seasons).map((sKey) => (
                        <button key={sKey} data-focusable onClick={() => setSelectedSeason(sKey)}
                          className={`tv-focusable px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedSeason === sKey ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                          }`}>Temporada {sKey}</button>
                      ))}
                    </div>
                    {selectedSeason && seasons[selectedSeason] && (
                      <div className="space-y-1.5 max-h-60 overflow-y-auto hide-scrollbar">
                        {seasons[selectedSeason].map((ep: any) => (
                          <button key={ep.id} data-focusable onClick={() => handlePlayEpisode(ep)}
                            className="tv-focusable w-full flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-all text-left">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Play className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-foreground text-sm font-medium truncate">
                                E{ep.episode_num} - {ep.title || `Episódio ${ep.episode_num}`}
                              </p>
                              {ep.info?.plot && <p className="text-muted-foreground text-xs line-clamp-1">{ep.info.plot}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SeriesSection;
