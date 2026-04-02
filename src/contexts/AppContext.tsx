import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { XtreamCredentials } from "@/lib/xtream";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type Section = "home" | "live" | "movies" | "series" | "favorites" | "player" | "maintenance";

interface PlayerState {
  url: string;
  title: string;
  type: "live" | "movie" | "series";
  streamId: number;
  extension?: string;
  episodeId?: number;
  seasonNum?: number;
  episodeNum?: number;
}

interface AppUser {
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  account_expires_at: string | null;
  is_permanent: boolean;
  is_banned: boolean;
  ban_reason: string | null;
}

interface AppContextType {
  credentials: XtreamCredentials | null;
  section: Section;
  playerState: PlayerState | null;
  expiresAt: string | null;
  loading: boolean;
  navigate: (section: Section) => void;
  openPlayer: (state: PlayerState) => void;
  closePlayer: () => void;
  previousSection: Section;
  // Auth
  authUser: User | null;
  appUser: AppUser | null;
  authLoading: boolean;
  signOut: () => void;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [credentials, setCredentials] = useState<XtreamCredentials | null>(null);
  const [section, setSection] = useState<Section>("home");
  const [previousSection, setPreviousSection] = useState<Section>("home");
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth state
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("Em manutenção");

  // Auth listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      if (!session?.user) {
        setAppUser(null);
        setAuthLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      if (!session?.user) setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch app_user profile when authenticated
  useEffect(() => {
    if (!authUser) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("app_users")
        .select("*")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (data) {
        setAppUser(data as AppUser);
        // Update last_login via edge function would be ideal but for now just set state
      }
      setAuthLoading(false);
    };

    fetchProfile();

    // Poll for profile changes every 30s (realtime removed for security)
    const interval = setInterval(() => fetchProfile(), 30000);
    return () => clearInterval(interval);
  }, [authUser]);

  // Fetch maintenance mode settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("*")
        .eq("key", "maintenance_mode")
        .maybeSingle();

      if (data?.value && typeof data.value === "object" && "enabled" in data.value) {
        const val = data.value as { enabled: boolean; message?: string };
        setMaintenanceMode(val.enabled);
        setMaintenanceMessage(val.message || "Em manutenção");
      }
    };

    fetchSettings();

    // Realtime for settings changes - auto-reload on admin changes
    const channel = supabase
      .channel("settings-changes")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "app_settings",
      }, (payload) => {
        const key = (payload.new as any)?.key;
        // For critical admin changes, force instant reload
        if (key === "maintenance_mode" || key === "default_host" || key === "admin_emails") {
          window.location.reload();
          return;
        }
        fetchSettings();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Fetch IPTV credentials
  const fetchCredentials = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("iptv_credentials")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setCredentials(null);
          setSection("maintenance");
          setExpiresAt(data.expires_at);
        } else {
          setCredentials({
            host: data.host,
            username: data.username,
            password: data.password,
          });
          setExpiresAt(data.expires_at);
          setSection("home");
        }
      } else {
        setSection("maintenance");
      }
    } catch (e) {
      console.error("Failed to fetch credentials:", e);
      setSection("maintenance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser && appUser && !appUser.is_banned) {
      fetchCredentials();
    } else {
      setLoading(false);
    }

    // Poll for credential changes every 60s (realtime removed for security)
    const interval = setInterval(() => {
      if (authUser && appUser && !appUser.is_banned) {
        fetchCredentials();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchCredentials, authUser, appUser]);

  const navigate = useCallback((s: Section) => {
    setPreviousSection(section);
    setSection(s);
  }, [section]);

  const openPlayer = useCallback((state: PlayerState) => {
    setPreviousSection(section);
    setPlayerState(state);
    setSection("player");
  }, [section]);

  const closePlayer = useCallback(() => {
    setPlayerState(null);
    setSection(previousSection === "player" ? "home" : previousSection);
  }, [previousSection]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setAppUser(null);
    setSection("home");
  }, []);

  return (
    <AppContext.Provider value={{
      credentials, section, playerState, expiresAt, loading,
      navigate, openPlayer, closePlayer, previousSection,
      authUser, appUser, authLoading, signOut,
      maintenanceMode, maintenanceMessage,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
