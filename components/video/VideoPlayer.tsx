"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import Hls from "hls.js";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";
import { getLivepeerHLS, getLivepeerThumbnail } from "@/lib/livepeer";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  playbackId: string;
  thumbnailUrl?: string;
  isActive: boolean;
  onDoubleTap?: () => void;
  className?: string;
}

export function VideoPlayer({
  playbackId,
  thumbnailUrl,
  isActive,
  onDoubleTap,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const lastTapRef = useRef(0);
  const heartTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Initialize HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackId) return;

    const src = getLivepeerHLS(playbackId);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 10,
        maxMaxBufferLength: 30,
      });

      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => setLoaded(true));
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        // Log only serializable fields — data object itself isn't JSON-safe
        console.warn("HLS fatal:", data.type, data.details);
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad(); // retry
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          hls.destroy();
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = src;
      video.addEventListener("loadedmetadata", () => setLoaded(true));
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [playbackId]);

  // Sync muted via ref — React doesn't reliably sync the muted DOM attribute
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted]);

  // Play/pause based on visibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !loaded) return;

    if (isActive && !paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive, paused, loaded]);

  // Reset on active change
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.currentTime = 0;
    }
  }, [isActive]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap
      setShowHeart(true);
      if (heartTimeoutRef.current) clearTimeout(heartTimeoutRef.current);
      heartTimeoutRef.current = setTimeout(() => setShowHeart(false), 1200);
      onDoubleTap?.();
    } else {
      // Single tap — toggle pause
      setPaused((p) => {
        const video = videoRef.current;
        if (!video) return p;
        if (p) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
        return !p;
      });
    }
    lastTapRef.current = now;
  }, [onDoubleTap]);

  const thumbnail =
    thumbnailUrl || (playbackId ? getLivepeerThumbnail(playbackId) : "");

  return (
    <div
      className={cn("relative w-full h-full bg-black overflow-hidden", className)}
      onClick={handleTap}
    >
      {/* Thumbnail placeholder */}
      {!loaded && thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt="Video thumbnail"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      <video
        ref={videoRef}
        className={cn(
          "absolute inset-0 w-full h-full object-contain transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
        muted
        playsInline
        loop
        preload="metadata"
      />

      {/* Double tap heart */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ type: "spring", damping: 12 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <span className="text-7xl drop-shadow-[0_0_30px_rgba(255,55,95,0.8)]">
              ❤️
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause indicator */}
      <AnimatePresence>
        {paused && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.7, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
              <Play size={28} className="text-white ml-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading shimmer */}
      {!loaded && (
        <div className="absolute inset-0 shimmer-bg" />
      )}

      {/* Mute / unmute button — prominent bottom-right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMuted((m) => !m);
        }}
        className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full backdrop-blur-md border border-white/20 text-white transition-all active:scale-95"
        style={{ background: "rgba(0,0,0,0.65)", padding: "6px 12px" }}
      >
        {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        <span className="text-xs font-semibold">{muted ? "Unmute" : "Mute"}</span>
      </button>
    </div>
  );
}
