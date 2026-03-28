import React, { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { getFavorites, removeFavorite, type FavoriteItem } from "@/lib/storage";
import { buildStreamUrl } from "@/lib/xtream";
import ContentCard from "./ContentCard";
import { Heart } from "lucide-react";

const FavoritesSection: React.FC = () => {
  const { credentials, openPlayer } = useApp();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const handlePlay = (item: FavoriteItem) => {
    if (!credentials) return;
    const url = buildStreamUrl(credentials, item.id, item.type);
    openPlayer({ url, title: item.name, type: item.type, streamId: item.id });
  };

  const handleRemove = (item: FavoriteItem) => {
    removeFavorite(item.id, item.type);
    setFavorites(getFavorites());
  };

  return (
    <div className="h-full overflow-y-auto hide-scrollbar p-6">
      <div className="flex items-center gap-2 mb-6">
        <Heart className="w-5 h-5 text-primary" />
        <h1 className="font-display text-lg font-bold text-foreground tracking-wider">FAVORITOS</h1>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[60%] text-center">
          <Heart className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Nenhum favorito salvo</p>
          <p className="text-muted-foreground/60 text-sm">Adicione canais, filmes ou séries aos favoritos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {favorites.map((item) => (
            <ContentCard key={`${item.type}-${item.id}`} title={item.name} image={item.icon || "/placeholder.svg"}
              onClick={() => handlePlay(item)} onFavorite={() => handleRemove(item)} isFavorite={true} />
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesSection;
