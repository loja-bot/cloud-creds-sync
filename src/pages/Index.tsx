import React, { useState } from "react";
import { AppProvider, useApp } from "@/contexts/AppContext";
import Sidebar from "@/components/Sidebar";
import HomeSection from "@/components/HomeSection";
import LiveSection from "@/components/LiveSection";
import MoviesSection from "@/components/MoviesSection";
import SeriesSection from "@/components/SeriesSection";
import FavoritesSection from "@/components/FavoritesSection";
import VideoPlayer from "@/components/VideoPlayer";
import MaintenanceScreen from "@/components/MaintenanceScreen";
import SplashScreen from "@/components/SplashScreen";
import LoginScreen from "@/components/LoginScreen";
import BannedScreen from "@/components/BannedScreen";
import AccountExpiredScreen from "@/components/AccountExpiredScreen";
import { AnimatePresence } from "framer-motion";
import { Loader2, Tv } from "lucide-react";
import InstaWatermark from "@/components/InstaWatermark";
import SupportChat from "@/components/SupportChat";

const AppContent: React.FC = () => {
  const { section, loading, authUser, appUser, authLoading, maintenanceMode, maintenanceMessage } = useApp();
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  // Auth loading
  if (authLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Tv className="w-10 h-10 text-primary" />
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  // Not logged in
  if (!authUser) {
    return <LoginScreen />;
  }

  // Banned
  if (appUser?.is_banned) {
    return <BannedScreen reason={appUser.ban_reason} />;
  }

  // Account expired (not permanent and has expiration date in the past)
  if (appUser && !appUser.is_permanent && appUser.account_expires_at) {
    if (new Date(appUser.account_expires_at) < new Date()) {
      return <AccountExpiredScreen />;
    }
  }

  // Admin-forced maintenance mode
  if (maintenanceMode) {
    return <MaintenanceScreen message={maintenanceMessage} />;
  }

  // IPTV loading
  if (loading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Tv className="w-10 h-10 text-primary" />
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  // No IPTV credentials (playlist maintenance)
  if (section === "maintenance") return <MaintenanceScreen />;
  if (section === "player") return <VideoPlayer />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {section === "home" && <HomeSection key="home" />}
          {section === "live" && <LiveSection key="live" />}
          {section === "movies" && <MoviesSection key="movies" />}
          {section === "series" && <SeriesSection key="series" />}
          {section === "favorites" && <FavoritesSection key="favorites" />}
        </AnimatePresence>
      </main>
      <InstaWatermark />
      <SupportChat />
    </div>
  );
};

const Index = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default Index;
