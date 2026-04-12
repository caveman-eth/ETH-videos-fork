"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { FeedContainer } from "@/components/feed/FeedContainer";
import { SplashScreen } from "@/components/onboarding/SplashScreen";
import { useFeed } from "@/hooks/useFeed";
import { useEFPFollowing } from "@/hooks/useEFP";
import { useRouter } from "next/navigation";

export default function FollowingPage() {
  const { isConnected, address } = useAccount();
  const router = useRouter();
  const { following } = useEFPFollowing(address);
  const { videos, loading, refreshing, hasMore, loadInitial, loadMore, refresh } =
    useFeed("following", following);

  useEffect(() => {
    if (isConnected) loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, following.length]);

  if (!isConnected) {
    return <SplashScreen onConnected={() => {}} onBrowse={() => router.push("/")} />;
  }

  return (
    <main className="relative h-dvh overflow-hidden bg-eth-dark">
      <Header transparent />
      <FeedContainer
        videos={videos}
        loading={loading}
        refreshing={refreshing}
        hasMore={hasMore}
        tab="following"
        onTabChange={() => router.push("/")}
        onLoadMore={loadMore}
        onRefresh={refresh}
      />
      <BottomNav />
    </main>
  );
}
