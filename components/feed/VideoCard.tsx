"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
} from "lucide-react";
import { useAccount, useWriteContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { ENSAvatar } from "@/components/ui/ENSAvatar";
import { TipModal } from "@/components/tips/TipModal";
import { CommentsSheet } from "@/components/video/CommentsSheet";
import { DMButton } from "@/components/messaging/DMButton";
import {
  formatCount,
  formatRelativeTime,
  formatDisplayName,
  cn,
} from "@/lib/utils";
import { CONTRACTS, REACTIONS_ABI } from "@/lib/contracts";
import type { VideoMetadata } from "@/types";

interface VideoCardProps {
  video: VideoMetadata;
  isActive: boolean;
  onComment?: () => void;
  onProfileClick?: (address: string) => void;
}

export function VideoCard({ video, isActive, onProfileClick }: VideoCardProps) {
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { writeContractAsync } = useWriteContract();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(video.likes);
  const [showTip, setShowTip] = useState(false);
  const [tipToken, setTipToken] = useState<"ETH" | "USDC">("ETH");
  const [showComments, setShowComments] = useState(false);
  const [likeAnimation, setLikeAnimation] = useState(false);

  const handleLike = useCallback(async () => {
    if (!address) { openConnectModal?.(); return; }
    setLiked((l) => !l);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
    setLikeAnimation(true);
    setTimeout(() => setLikeAnimation(false), 600);
    try {
      await writeContractAsync({
        address: CONTRACTS.mainnet.reactions,
        abi: REACTIONS_ABI,
        functionName: liked ? "unlike" : "like",
        args: [video.cid],
      });
    } catch {
      setLiked((l) => !l);
      setLikeCount((c) => (liked ? c + 1 : c - 1));
    }
  }, [address, liked, video.cid, writeContractAsync, openConnectModal]);

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/video/${video.cid}`;
    navigator.share?.({ url, title: video.caption }) ??
      navigator.clipboard.writeText(url);
  }, [video.cid, video.caption]);

  const displayName = formatDisplayName(video.poster, video.posterEns);

  return (
    <div className="bg-eth-card border-b border-eth-border/40 md:rounded-2xl md:border md:shadow-[0_4px_24px_rgba(0,0,0,0.5)] overflow-hidden">
      {/* ── Top bar: avatar + name + timestamp ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => onProfileClick?.(video.poster)}
          className="tap-highlight-none flex-shrink-0"
        >
          <ENSAvatar
            address={video.poster}
            ensName={video.posterEns}
            avatarUrl={video.posterAvatar}
            size="md"
            showRing
          />
        </button>
        <button
          onClick={() => onProfileClick?.(video.poster)}
          className="flex-1 text-left tap-highlight-none min-w-0"
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-white font-bold text-sm leading-none">
              @{displayName}
            </span>
          </div>
          <span className="text-muted-foreground text-xs">
            {formatRelativeTime(video.timestamp)}
          </span>
        </button>
        <button className="text-muted-foreground/50 hover:text-white/70 transition-colors tap-highlight-none">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* ── 16:9 video container ── */}
      <div className="relative w-full" style={{ aspectRatio: "16/9", background: "#000" }}>
        <VideoPlayer
          playbackId={video.playbackId}
          thumbnailUrl={video.thumbnailUrl}
          isActive={isActive}
          className="absolute inset-0"
        />
      </div>

      {/* ── Action row ── */}
      <div className="flex items-center px-3 py-2 gap-1">
        {/* Like */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleLike}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl tap-highlight-none"
          style={{ minWidth: 56 }}
        >
          <motion.div
            animate={likeAnimation ? { scale: [1, 1.5, 1] } : {}}
            transition={{ duration: 0.4 }}
          >
            <Heart
              size={22}
              className={cn(
                "transition-all duration-200",
                liked
                  ? "fill-neon-pink text-neon-pink drop-shadow-[0_0_8px_rgba(255,55,95,0.9)]"
                  : "text-white/70"
              )}
            />
          </motion.div>
          <span className={cn("text-xs font-semibold", liked ? "text-neon-pink" : "text-white/70")}>
            {formatCount(likeCount)}
          </span>
        </motion.button>

        {/* Comment */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => setShowComments(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl tap-highlight-none"
        >
          <MessageCircle size={22} className="text-white/70" />
          <span className="text-xs font-semibold text-white/70">
            {formatCount(video.comments)}
          </span>
        </motion.button>

        {/* Share */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl tap-highlight-none"
        >
          <Share2 size={22} className="text-white/70" />
        </motion.button>

        {/* DM */}
        <div className="flex items-center">
          <DMButton
            peerAddress={video.poster}
            variant="icon"
            className="w-10 h-10 bg-transparent border-none text-white/70 hover:text-white"
          />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Tip ETH */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            if (!address) { openConnectModal?.(); return; }
            setTipToken("ETH");
            setShowTip(true);
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{
            background: "rgba(98,126,234,0.15)",
            border: "1px solid rgba(98,126,234,0.35)",
            color: "rgba(255,255,255,0.85)",
          }}
        >
          <ETHIcon size={14} />
          Tip
        </motion.button>

        {/* Tip USDC */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            if (!address) { openConnectModal?.(); return; }
            setTipToken("USDC");
            setShowTip(true);
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{
            background: "rgba(39,117,202,0.15)",
            border: "1px solid rgba(39,117,202,0.35)",
            color: "rgba(255,255,255,0.85)",
          }}
        >
          <USDCIcon size={14} />
          USDC
        </motion.button>
      </div>

      {/* ── Caption ── */}
      {video.caption && (
        <div className="px-4 pb-3">
          <p className="text-white/90 text-sm leading-relaxed">
            {video.caption}
          </p>
          {video.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {video.hashtags.slice(0, 4).map((tag) => (
                <span key={tag} className="text-neon-cyan text-xs font-medium">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CommentsSheet
        open={showComments}
        onClose={() => setShowComments(false)}
        videoCid={video.cid}
        commentCount={video.comments}
      />
      <TipModal
        open={showTip}
        onClose={() => setShowTip(false)}
        creatorAddress={video.poster}
        creatorEns={video.posterEns}
        creatorAvatar={video.posterAvatar}
        videoCid={video.cid}
        initialToken={tipToken}
      />
    </div>
  );
}

function ETHIcon({ size = 18 }: { size?: number }) {
  return (
    <img src="/icons/eth.svg" alt="ETH" width={size} height={size}
      style={{ objectFit: "contain", display: "block", filter: "brightness(0) invert(1)" }} />
  );
}

function USDCIcon({ size = 18 }: { size?: number }) {
  return (
    <img src="/icons/usdc.png" alt="USDC" width={size} height={size}
      style={{ objectFit: "contain", display: "block" }} />
  );
}
