import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import type { XtreamCredentials } from "@/lib/xtream";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

type Section = "home" | "live" | "movies" | "series" | "favorites" | "manual" | "player" | "maintenance";

interface AgeVerification {
  is_verified: boolean;
  age_category: string;
}


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
  ageVerification: AgeVerification | null;
  ageVerificationLoading: boolean;
  refreshVerification: () => void;
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
  const [ageVerification, setAgeVerification] = useState<AgeVerification | null>(null);
  const [ageVerificationLoading, setAgeVerificationLoading] = useState(true);

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

  const fetchVerification = useCallback(async () => {
    if (!authUser) {
      setAgeVerification(null);
      setAgeVerificationLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from("age_verifications")
        .select("is_verified, age_category")
        .eq("user_id", authUser.id)
        .maybeSingle();
      setAgeVerification(data as AgeVerification | null);
    } catch (e) {
      console.error("Failed to fetch verification:", e);
    } finally {
      setAgeVerificationLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    fetchVerification();
  }, [fetchVerification]);


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
    // CRITICAL: never disrupt playback. Skip refetch while watching.
    if (currentSectionRef.current === "player") {
      setLoading(false);
      return;
    }
    try {
      const { data: resp, error } = await supabase.functions.invoke("get-iptv-credentials", { body: {} });
      if (error) throw error;
      const data = (resp as { data?: { host: string; username: string; password: string; expires_at: string | null } | null })?.data ?? null;

      if (!data) {
        setCredentials((prev) => (prev === null ? prev : null));
        wasInMaintenanceRef.current = true;
        setSection((s) => (s === "maintenance" ? s : "maintenance"));
        setExpiresAt((prev) => (prev === null ? prev : null));
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setCredentials((prev) => (prev === null ? prev : null));
        wasInMaintenanceRef.current = true;
        setSection((s) => (s === "maintenance" ? s : "maintenance"));
        setExpiresAt((prev) => (prev === data.expires_at ? prev : data.expires_at));
        return;
      }

      // Only update credentials if values actually changed (avoid re-renders during playback)
      setCredentials((prev) => {
        if (
          prev &&
          prev.host === data.host &&
          prev.username === data.username &&
          prev.password === data.password
        ) {
          return prev;
        }
        return { host: data.host, username: data.username, password: data.password };
      });
      setExpiresAt((prev) => (prev === data.expires_at ? prev : data.expires_at));

      if (wasInMaintenanceRef.current) {
        wasInMaintenanceRef.current = false;
        toast.success("Playlist atualizada!", {
          description: "Nova playlist detectada. Aproveite!",
          duration: 5000,
        });
        setSection((s) => (s === "maintenance" ? "home" : s));
      }
    } catch (e) {
      console.error("Failed to fetch credentials:", e);
      if ((currentSectionRef.current as Section) !== "player") {
        setCredentials(null);
        setSection("maintenance");
      }
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

    // IPTV credentials are no longer broadcast via realtime (sensitive data).
    // We poll the secure edge function instead. Polling skips when in the player.
    const interval = setInterval(() => {
      if (authUser && appUser && !appUser.is_banned && currentSectionRef.current !== "player") {
        fetchCredentials();
      }
    }, 60000);

    return () => {
      clearInterval(interval);
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
      ageVerification,
      ageVerificationLoading,
      refreshVerification: fetchVerification,
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
