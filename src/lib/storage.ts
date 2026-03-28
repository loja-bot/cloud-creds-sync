// Local storage helpers for favorites, continue watching, credentials

import type { XtreamCredentials } from "./xtream";

const KEYS = {
  credentials: "thayson_tv_creds",
  favorites: "thayson_tv_favorites",
  continueWatching: "thayson_tv_continue",
};

export function saveCredentials(creds: XtreamCredentials) {
  localStorage.setItem(KEYS.credentials, JSON.stringify(creds));
}

export function getCredentials(): XtreamCredentials | null {
  const raw = localStorage.getItem(KEYS.credentials);
  return raw ? JSON.parse(raw) : null;
}

export function clearCredentials() {
  localStorage.removeItem(KEYS.credentials);
}

export interface FavoriteItem {
  id: number;
  type: "live" | "movie" | "series";
  name: string;
  icon: string;
  addedAt: number;
}

export function getFavorites(): FavoriteItem[] {
  const raw = localStorage.getItem(KEYS.favorites);
  return raw ? JSON.parse(raw) : [];
}

export function addFavorite(item: FavoriteItem) {
  const favs = getFavorites();
  if (!favs.find((f) => f.id === item.id && f.type === item.type)) {
    favs.push(item);
    localStorage.setItem(KEYS.favorites, JSON.stringify(favs));
  }
}

export function removeFavorite(id: number, type: string) {
  const favs = getFavorites().filter((f) => !(f.id === id && f.type === type));
  localStorage.setItem(KEYS.favorites, JSON.stringify(favs));
}

export function isFavorite(id: number, type: string): boolean {
  return getFavorites().some((f) => f.id === id && f.type === type);
}

export interface ContinueItem {
  id: number;
  type: "live" | "movie" | "series";
  name: string;
  icon: string;
  timestamp: number;
  progress?: number;
  duration?: number;
  extension?: string;
  episodeId?: number;
  seasonNum?: number;
  episodeNum?: number;
}

export function getContinueWatching(): ContinueItem[] {
  const raw = localStorage.getItem(KEYS.continueWatching);
  return raw ? JSON.parse(raw) : [];
}

export function saveContinueWatching(item: ContinueItem) {
  let items = getContinueWatching().filter((i) => !(i.id === item.id && i.type === item.type));
  items.unshift({ ...item, timestamp: Date.now() });
  if (items.length > 20) items = items.slice(0, 20);
  localStorage.setItem(KEYS.continueWatching, JSON.stringify(items));
}
