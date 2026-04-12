"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { SplashScreen } from "@/components/onboarding/SplashScreen";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { FeedContainer } from "@/components/feed/FeedContainer";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { UploadModal } from "@/components/video/UploadModal";
import { XMTPInbox } from "@/components/messaging/XMTPInbox";
import { ProfileRouteClient } from "@/app/profile/[address]/ProfileRouteClient";
import { useFeed } from "@/hooks/useFeed";
import { useEFPFollowing } from "@/hooks/useEFP";
import type { FeedTab } from "@/types";

type AppState = "splash" | "browse" | "onboarding" | "app" | "profile";

export default function HomePage() {
  const { isConnected, address } = useAccount();
  const [appState, setAppState] = useState<AppState>("splash");
  const [tab, setTab] = useState<FeedTab>("for-you");
  const [showUpload, setShowUpload] = useState(false);
  const [profileAddress, setProfileAddress] = useState<string>("");

  const { following } = useEFPFollowing(address);
  const { videos, loading, refreshing, hasMore, loadInitial, loadMore, refresh, prependVideo } =
    useFeed(tab, following);

  // Restore session or handle connect/disconnect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasOnboarded = localStorage.getItem("ethvideos-onboarded");
    if (isConnected && hasOnboarded === "true") {
      setAppState("app");
    } else if (isConnected && (appState === "splash" || appState === "browse")) {
      setAppState("onboarding");
    } else if (!isConnected && appState === "app") {
      // Wallet disconnected — return to splash
      localStorage.removeItem("ethvideos-onboarded");
      setAppState("splash");
    }
  }, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnected = useCallback(() => {
    setAppState("onboarding");
  }, []);

  const handleBrowse = useCallback(() => {
    setAppState("browse");
    loadInitial();
  }, [loadInitial]);

  const handleHome = useCallback(() => {
    setAppState("splash");
  }, []);

  const handleProfileClick = useCallback((addr: string) => {
    setProfileAddress(addr);
    setAppState("profile");
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem("ethvideos-onboarded", "true");
    setAppState("app");
    loadInitial();
  }, [loadInitial]);

  const handleTabChange = useCallback(
    (newTab: FeedTab) => {
      setTab(newTab);
      loadInitial();
    },
    [loadInitial]
  );

  // Load initial feed when entering app state
  useEffect(() => {
    if (appState === "app") {
      loadInitial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState]);

  if (appState === "splash") {
    return <SplashScreen onConnected={handleConnected} onBrowse={handleBrowse} />;
  }

  if (appState === "onboarding") {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  if (appState === "profile") {
    return (
      <ProfileRouteClient
        address={profileAddress}
        onBack={() => setAppState(isConnected ? "app" : "browse")}
      />
    );
  }

  // "browse" and "app" share the same feed UI
  return (
    <main className="relative h-dvh overflow-hidden bg-eth-dark">
      <Header transparent onHome={appState === "browse" ? handleHome : undefined} />

      <FeedContainer
        videos={videos}
        loading={loading}
        refreshing={refreshing}
        hasMore={hasMore}
        tab={tab}
        onTabChange={handleTabChange}
        onLoadMore={loadMore}
        onRefresh={refresh}
        onProfileClick={handleProfileClick}
      />

      <BottomNav
        onUploadClick={() => setShowUpload(true)}
        onProfileClick={handleProfileClick}
      />

      <XMTPInbox />

      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={(video) => {
          setShowUpload(false);
          prependVideo(video);
        }}
      />
    </main>
  );
}
