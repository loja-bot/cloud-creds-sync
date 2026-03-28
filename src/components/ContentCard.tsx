import React from "react";
import { motion } from "framer-motion";
import { Star, Heart } from "lucide-react";

interface ContentCardProps {
  title: string;
  image: string;
  rating?: string;
  isFavorite?: boolean;
  onClick: () => void;
  onFavorite?: () => void;
  aspectRatio?: "poster" | "landscape";
}

const ContentCard: React.FC<ContentCardProps> = ({
  title,
  image,
  rating,
  isFavorite,
  onClick,
  onFavorite,
  aspectRatio = "poster",
}) => {
  return (
    <motion.div
      data-focusable
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`tv-focusable card-shine relative rounded-xl overflow-hidden cursor-pointer bg-card border border-transparent group ${
        aspectRatio === "poster" ? "aspect-[2/3]" : "aspect-video"
      }`}
    >
      <img
        src={image}
        alt={title}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/placeholder.svg";
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-foreground text-xs font-medium line-clamp-2 leading-tight">{title}</p>
        {rating && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 text-primary fill-primary" />
            <span className="text-primary text-[10px] font-semibold">{rating}</span>
          </div>
        )}
      </div>

      {/* Favorite button */}
      {onFavorite && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavorite();
          }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? "text-destructive fill-destructive" : "text-foreground"}`} />
        </button>
      )}
    </motion.div>
  );
};

export default ContentCard;
