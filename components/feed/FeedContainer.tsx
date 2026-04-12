"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Loader2 } from "lucide-react";
import { VideoCard } from "./VideoCard";
import { FeedTabs } from "./FeedTabs";
import type { VideoMetadata, FeedTab } from "@/types";
import { cn } from "@/lib/utils";

interface FeedContainerProps {
  videos: VideoMetadata[];
  loading: boolean;
  refreshing: boolean;
  hasMore: boolean;
  tab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  onProfileClick?: (address: string) => void;
}

export function FeedContainer({
  videos,
  loading,
  refreshing,
  hasMore,
  tab,
  onTabChange,
  onLoadMore,
  onRefresh,
  onProfileClick,
}: FeedContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection observer — track active video (50% visible = active)
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(
              (entry.target as HTMLElement).dataset.index || "0"
            );
            setActiveIndex(index);
            if (index >= videos.length - 3 && hasMore && !loading) {
              onLoadMore();
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    const items = containerRef.current?.querySelectorAll("[data-index]");
    items?.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [videos.length, hasMore, loading, onLoadMore]);

  // Pull-to-refresh
  const touchStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const isPulling = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, 80));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 60) {
      onRefresh();
    }
    setPullDistance(0);
    isPulling.current = false;
  }, [pullDistance, onRefresh]);

  return (
    <div className="relative h-dvh">
      {/* Pull to refresh indicator */}
      <AnimatePresence>
        {pullDistance > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: pullDistance / 80 }}
            exit={{ opacity: 0 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-eth-card border border-eth-border rounded-full px-4 py-2"
            style={{ transform: `translateX(-50%) translateY(${pullDistance}px)` }}
          >
            <RefreshCw
              size={14}
              className="text-neon-cyan"
              style={{ transform: `rotate(${pullDistance * 4}deg)` }}
            />
            <span className="text-xs text-muted-foreground">
              {pullDistance > 60 ? "Release to refresh" : "Pull to refresh"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refresh overlay */}
      <AnimatePresence>
        {refreshing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-eth-dark/80 backdrop-blur-sm"
          >
            <Loader2 className="text-neon-cyan animate-spin" size={32} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feed tabs — overlaid on feed */}
      <div className="absolute top-14 left-0 right-0 z-30 flex justify-center">
        <FeedTabs activeTab={tab} onTabChange={onTabChange} />
      </div>

      {/* Feed scroll container */}
      <div
        ref={containerRef}
        className="feed-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Desktop: constrain feed width; mobile stays full-width */}
        <div className="feed-inner">
        {videos.length === 0 && !loading ? (
          <EmptyState tab={tab} />
        ) : (
          <>
            {videos.map((video, index) => (
              <div
                key={`${video.cid}-${index}`}
                data-index={index}
                className="feed-item"
              >
                <VideoCard
                  video={video}
                  isActive={activeIndex === index}
                  onProfileClick={onProfileClick}
                />
              </div>
            ))}

            {/* Loading more */}
            {loading && (
              <div className="flex items-center justify-center py-10">
                <div className="w-8 h-8 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin" />
              </div>
            )}

            {/* End of feed */}
            {!hasMore && !loading && videos.length > 0 && (
              <div className="flex items-center justify-center py-10">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">You've seen everything ✨</p>
                  <button onClick={onRefresh} className="mt-3 text-neon-cyan text-sm font-medium">
                    Refresh feed
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        </div> {/* /feed-inner */}
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: FeedTab }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center px-8">
        <div className="text-5xl mb-4">
          {tab === "following" ? "👥" : "🎬"}
        </div>
        <h3 className="text-white font-bold text-lg mb-2">
          {tab === "following"
            ? "No videos from people you follow"
            : "No videos yet"}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {tab === "following"
            ? "Follow creators with ENS names to see their videos here"
            : "Be the first to post a video on ethvideos.eth"}
        </p>
      </div>
    </div>
  );
}
