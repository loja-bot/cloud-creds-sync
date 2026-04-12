import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { XtreamCredentials } from "@/lib/xtream";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  const currentSectionRef = useRef<Section>("home");
  const wasInMaintenanceRef = useRef(false);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("Em manutenção");

  useEffect(() => {
    currentSectionRef.current = section;
  }, [section]);

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

  useEffect(() => {
    if (!authUser) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("app_users")
        .select("*")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (data) {
        setAppUser((prev) => {
          if (
            prev &&
            prev.user_id === data.user_id &&
            prev.email === data.email &&
            prev.display_name === data.display_name &&
            prev.avatar_url === data.avatar_url &&
            prev.account_expires_at === data.account_expires_at &&
            prev.is_permanent === data.is_permanent &&
            prev.is_banned === data.is_banned &&
            prev.ban_reason === data.ban_reason
          ) {
            return prev;
          }
          return data as AppUser;
        });
      }
      setAuthLoading(false);
    };

    fetchProfile();

    const interval = setInterval(fetchProfile, 30000);
    return () => clearInterval(interval);
  }, [authUser]);

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

    const channel = supabase
      .channel("settings-changes")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "app_settings",
      }, (payload) => {
        const key = (payload.new as { key?: string } | null)?.key;
        if (key === "maintenance_mode") {
          fetchSettings();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

      if (!data) {
        setCredentials(null);
        wasInMaintenanceRef.current = true;
        setSection("maintenance");
        setExpiresAt(null);
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setCredentials(null);
        wasInMaintenanceRef.current = true;
        setSection("maintenance");
        setExpiresAt(data.expires_at);
        return;
      }

      const newCreds = {
        host: data.host,
        username: data.username,
        password: data.password,
      };

      const wasInMaintenance = wasInMaintenanceRef.current;
      setCredentials(newCreds);
      setExpiresAt(data.expires_at);

      if (wasInMaintenance) {
        wasInMaintenanceRef.current = false;
        toast.success("Playlist atualizada!", {
          description: "Nova playlist detectada. Aproveite!",
          duration: 5000,
        });
        setSection("home");
      }
    } catch (e) {
      console.error("Failed to fetch credentials:", e);
      setCredentials(null);
      setSection("maintenance");
    } finally {
      setLoading(false);
    }
  }, [previousSection]);

  useEffect(() => {
    if (authUser && appUser && !appUser.is_banned) {
      fetchCredentials();
    } else {
      setLoading(false);
    }

    const channel = supabase
      .channel("iptv-credentials-changes")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "iptv_credentials",
      }, () => {
        if (authUser && appUser && !appUser.is_banned) {
          fetchCredentials();
        }
      })
      .subscribe();

    const interval = setInterval(() => {
      if (authUser && appUser && !appUser.is_banned) {
        fetchCredentials();
      }
    }, 60000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetchCredentials, authUser, appUser]);

  const navigate = useCallback((s: Section) => {
    setPreviousSection(currentSectionRef.current);
    setSection(s);
  }, []);

  const openPlayer = useCallback((state: PlayerState) => {
    setPreviousSection(currentSectionRef.current);
    setPlayerState(state);
    setSection("player");
  }, []);

  const closePlayer = useCallback(() => {
    setPlayerState(null);
    setSection((prev) => (prev === "player" ? (previousSection === "player" ? "home" : previousSection) : prev));
  }, [previousSection]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setAppUser(null);
    setCredentials(null);
    setSection("home");
  }, []);

  return (
    <AppContext.Provider value={{
      credentials,
      section,
      playerState,
      expiresAt,
      loading,
      navigate,
      openPlayer,
      closePlayer,
      previousSection,
      authUser,
      appUser,
      authLoading,
      signOut,
      maintenanceMode,
      maintenanceMessage,
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
