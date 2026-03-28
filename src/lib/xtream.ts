// Xtream Codes API client
// All requests go through our edge function proxy to avoid CORS

import { supabase } from "@/integrations/supabase/client";

export interface XtreamCredentials {
  host: string;
  username: string;
  password: string;
}

export interface Category {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface LiveStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string;
  added: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
}

export interface VodStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  rating: string;
  rating_5based: number;
  added: string;
  category_id: string;
  container_extension: string;
  custom_sid: string;
  direct_source: string;
}

export interface SeriesInfo {
  num: number;
  name: string;
  series_id: number;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  releaseDate: string;
  last_modified: string;
  rating: string;
  rating_5based: number;
  backdrop_path: string[];
  youtube_trailer: string;
  episode_run_time: string;
  category_id: string;
}

export interface EpgEntry {
  id: string;
  epg_id: string;
  title: string;
  lang: string;
  start: string;
  end: string;
  description: string;
  channel_id: string;
  start_timestamp: string;
  stop_timestamp: string;
}

async function proxyFetch(targetUrl: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke("iptv-proxy", {
    body: { url: targetUrl },
  });
  if (error) throw new Error(`Proxy error: ${error.message}`);
  return data;
}

function buildUrl(creds: XtreamCredentials, action: string, params = ""): string {
  const host = creds.host.replace(/\/$/, "");
  return `${host}/player_api.php?username=${creds.username}&password=${creds.password}&action=${action}${params}`;
}

export function buildStreamUrl(creds: XtreamCredentials, streamId: number, type: "live" | "movie" | "series", extension = "ts"): string {
  const host = creds.host.replace(/\/$/, "");
  if (type === "live") {
    return `${host}/live/${creds.username}/${creds.password}/${streamId}.${extension}`;
  }
  if (type === "movie") {
    return `${host}/movie/${creds.username}/${creds.password}/${streamId}.${extension}`;
  }
  return `${host}/series/${creds.username}/${creds.password}/${streamId}.${extension}`;
}

export async function authenticate(creds: XtreamCredentials) {
  const url = `${creds.host.replace(/\/$/, "")}/player_api.php?username=${creds.username}&password=${creds.password}`;
  return proxyFetch(url);
}

export async function getLiveCategories(creds: XtreamCredentials): Promise<Category[]> {
  return proxyFetch(buildUrl(creds, "get_live_categories"));
}

export async function getLiveStreams(creds: XtreamCredentials, categoryId?: string): Promise<LiveStream[]> {
  const params = categoryId ? `&category_id=${categoryId}` : "";
  return proxyFetch(buildUrl(creds, "get_live_streams", params));
}

export async function getVodCategories(creds: XtreamCredentials): Promise<Category[]> {
  return proxyFetch(buildUrl(creds, "get_vod_categories"));
}

export async function getVodStreams(creds: XtreamCredentials, categoryId?: string): Promise<VodStream[]> {
  const params = categoryId ? `&category_id=${categoryId}` : "";
  return proxyFetch(buildUrl(creds, "get_vod_streams", params));
}

export async function getVodInfo(creds: XtreamCredentials, vodId: number) {
  return proxyFetch(buildUrl(creds, "get_vod_info", `&vod_id=${vodId}`));
}

export async function getSeriesCategories(creds: XtreamCredentials): Promise<Category[]> {
  return proxyFetch(buildUrl(creds, "get_series_categories"));
}

export async function getSeries(creds: XtreamCredentials, categoryId?: string): Promise<SeriesInfo[]> {
  const params = categoryId ? `&category_id=${categoryId}` : "";
  return proxyFetch(buildUrl(creds, "get_series", params));
}

export async function getSeriesInfo(creds: XtreamCredentials, seriesId: number) {
  return proxyFetch(buildUrl(creds, "get_series_info", `&series_id=${seriesId}`));
}

export async function getShortEpg(creds: XtreamCredentials, streamId: number): Promise<{ epg_listings: EpgEntry[] }> {
  return proxyFetch(buildUrl(creds, "get_short_epg", `&stream_id=${streamId}`));
}
