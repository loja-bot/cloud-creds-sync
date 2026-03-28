import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/contexts/AppContext";
import { getLiveCategories, getLiveStreams, getShortEpg, buildStreamUrl, type Category, type LiveStream } from "@/lib/xtream";
import { addFavorite, removeFavorite, isFavorite } from "@/lib/storage";
import ContentCard from "./ContentCard";
import { Radio, Loader2 } from "lucide-react";

const LiveSection: React.FC = () => {
  const { credentials, openPlayer } = useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!credentials) return;
    getLiveCategories(credentials).then((cats) => {
      setCategories(cats || []);
      if (cats?.length) {
        setSelectedCat(cats[0].category_id);
      }
    }).catch(console.error);
  }, [credentials]);

  useEffect(() => {
    if (!credentials || !selectedCat) return;
    setLoading(true);
    getLiveStreams(credentials, selectedCat).then((s) => {
      setStreams(s || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [credentials, selectedCat]);

  const handlePlay = (stream: LiveStream) => {
    if (!credentials) return;
    const url = buildStreamUrl(credentials, stream.stream_id, "live");
    openPlayer({ url, title: stream.name, type: "live", streamId: stream.stream_id });
  };

  const toggleFav = (stream: LiveStream) => {
    if (isFavorite(stream.stream_id, "live")) {
      removeFavorite(stream.stream_id, "live");
    } else {
      addFavorite({ id: stream.stream_id, type: "live", name: stream.name, icon: stream.stream_icon, addedAt: Date.now() });
    }
  };

  return (
    <div className="flex h-full">
      {/* Categories sidebar */}
      <div className="w-[200px] min-w-[200px] border-r border-border/50 overflow-y-auto hide-scrollbar p-3 space-y-1">
        <div className="flex items-center gap-2 px-3 py-2 mb-2">
          <Radio className="w-4 h-4 text-primary" />
          <span className="font-display text-xs font-bold text-primary tracking-wider">AO VIVO</span>
        </div>
        {categories.map((cat) => (
          <button
            key={cat.category_id}
            data-focusable
            onClick={() => setSelectedCat(cat.category_id)}
            className={`tv-focusable w-full text-left px-3 py-2 rounded-lg text-xs transition-all truncate ${
              selectedCat === cat.category_id
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {cat.category_name}
          </button>
        ))}
      </div>

      {/* Streams grid */}
      <div className="flex-1 overflow-y-auto hide-scrollbar p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {streams.map((stream) => (
              <ContentCard
                key={stream.stream_id}
                title={stream.name}
                image={stream.stream_icon || "/placeholder.svg"}
                onClick={() => handlePlay(stream)}
                onFavorite={() => toggleFav(stream)}
                isFavorite={isFavorite(stream.stream_id, "live")}
                aspectRatio="landscape"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveSection;
