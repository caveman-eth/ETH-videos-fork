"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimationFrame } from "motion/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Play, ArrowRight, Upload, Radio } from "lucide-react";

interface SplashScreenProps {
  onConnected: () => void;
  onBrowse: () => void;
}

// ─── Theme: Void Broadcast ──────────────────────────────────────────────────
// Near-black base with electric violet, warm gold, ice blue signal accents.
// Inspired by broadcast network aesthetics meeting decentralized protocol design.
// ───────────────────────────────────────────────────────────────────────────

const CARDS = [
  {
    id: 1,
    bg: "linear-gradient(145deg, #100826 0%, #1e0d50 60%, #080318 100%)",
    glow: "rgba(168,85,247,0.4)",
    accentBar: "#a855f7",
  },
  {
    id: 2,
    bg: "linear-gradient(145deg, #041520 0%, #083050 60%, #030e18 100%)",
    glow: "rgba(56,189,248,0.35)",
    accentBar: "#38bdf8",
  },
  {
    id: 3,
    bg: "linear-gradient(145deg, #180712 0%, #3d0a2e 60%, #100410 100%)",
    glow: "rgba(236,72,153,0.35)",
    accentBar: "#ec4899",
  },
  {
    id: 4,
    bg: "linear-gradient(145deg, #160d00 0%, #3d2600 60%, #100800 100%)",
    glow: "rgba(245,158,11,0.35)",
    accentBar: "#f59e0b",
  },
  {
    id: 5,
    bg: "linear-gradient(145deg, #001a14 0%, #003d28 60%, #001010 100%)",
    glow: "rgba(16,185,129,0.35)",
    accentBar: "#10b981",
  },
];

const TICKER_ITEMS = [
  "IPFS Video Storage",
  "ENS Identity",
  "On-Chain Tips",
  "Zero Censorship",
  "No Ads. Ever.",
  "ETH & USDC Payments",
  "Own Your Content",
  "Decentralized Forever",
  "Livepeer Streaming",
  "Permissionless Upload",
];

// Duplicate for infinite scroll
const TICKER = [...TICKER_ITEMS, ...TICKER_ITEMS];

export function SplashScreen({ onConnected, onBrowse }: SplashScreenProps) {
  const { isConnected } = useAccount();

  useEffect(() => {
    if (isConnected) onConnected();
  }, [isConnected, onConnected]);

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: "#03050e", fontFamily: "var(--font-geist-sans)" }}
    >
      {/* ── GRAIN TEXTURE OVERLAY ─────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none z-10 opacity-[0.18]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
          mixBlendMode: "overlay",
        }}
      />

      {/* ── BACKGROUND: GRID + RADIAL SIGNAL ─────────────────── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)
            `,
            backgroundSize: "72px 72px",
          }}
        />
        {/* Broadcast radial — emanates from top-right (video side) */}
        <div
          className="absolute"
          style={{
            top: "-20%",
            right: "-10%",
            width: "70vw",
            height: "70vw",
            background:
              "radial-gradient(circle, rgba(168,85,247,0.08) 0%, rgba(56,189,248,0.04) 40%, transparent 70%)",
          }}
        />
        {/* Deep glow bottom-left (text side anchor) */}
        <div
          className="absolute"
          style={{
            bottom: "-10%",
            left: "-5%",
            width: "40vw",
            height: "40vw",
            background:
              "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)",
          }}
        />
        {/* Sweeping scanline */}
        <motion.div
          animate={{ y: ["0vh", "100vh"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.15) 30%, rgba(56,189,248,0.25) 50%, rgba(168,85,247,0.15) 70%, transparent 100%)",
          }}
        />
      </div>

      {/* ── HEADER ───────────────────────────────────────────── */}
      <header className="relative z-20 flex items-center px-6 md:px-10 pt-5 pb-4 flex-shrink-0">
        {/* Wordmark */}
        <div className="flex items-center gap-3">
          {/* Logo glyph */}
          <div
            className="relative w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #a855f7 0%, #38bdf8 100%)",
            }}
          >
            <Play size={14} fill="#03050e" style={{ color: "#03050e" }} className="ml-0.5" />
            {/* Inner glow */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.25) 0%, transparent 60%)",
              }}
            />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span
              className="text-base font-bold tracking-tight text-white"
              style={{ letterSpacing: "-0.02em" }}
            >
              Ethereum Videos
            </span>
          </div>
        </div>

        {/* Divider dot */}
        <div
          className="hidden md:block mx-8 h-3 w-px flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.1)" }}
        />

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-7 flex-1">
          {["Browse", "Creators", "Trending", "FAQ"].map((link, i) => (
            <span
              key={link}
              className="text-sm font-medium cursor-default select-none transition-colors duration-150"
              style={{
                color: i === 0 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)",
                letterSpacing: "-0.01em",
              }}
            >
              {link}
            </span>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Protocol badge */}
        <div
          className="hidden md:flex items-center gap-1.5 mr-4 px-2.5 py-1 rounded-full"
          style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
        >
          <Radio size={10} style={{ color: "#10b981" }} />
          <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#10b981" }}>
            Live
          </span>
        </div>

        {/* Connect button */}
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <button
              onClick={openConnectModal}
              className="relative flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-sm overflow-hidden group transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #a855f7 0%, #38bdf8 100%)",
                color: "#03050e",
                letterSpacing: "-0.01em",
              }}
            >
              <span className="relative z-10 flex items-center gap-2">
                <Upload size={13} />
                Connect Wallet
              </span>
              {/* Shimmer sweep */}
              <motion.div
                animate={{ x: ["-120%", "220%"] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5 }}
                className="absolute inset-0 w-1/2 skew-x-12"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
                }}
              />
            </button>
          )}
        </ConnectButton.Custom>
      </header>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <main className="relative z-20 flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[1fr_1fr] lg:grid-cols-[55%_45%] gap-0 px-6 md:px-10 pb-0 overflow-hidden">

        {/* LEFT — Typographic pillar */}
        <div className="flex flex-col justify-center py-6 md:py-0 md:pr-10">
          {/* Micro-label */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center gap-2 mb-5"
          >
            <div
              className="h-px w-8"
              style={{ background: "linear-gradient(90deg, #a855f7, transparent)" }}
            />
            <span
              className="text-[10px] font-bold tracking-[0.22em] uppercase"
              style={{ color: "rgba(168,85,247,0.8)" }}
            >
              Decentralized Video Protocol
            </span>
          </motion.div>

          {/* DISPLAY HEADLINE */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="font-black text-white leading-none mb-5 select-none"
            style={{
              fontSize: "clamp(52px, 7vw, 96px)",
              letterSpacing: "-0.04em",
              lineHeight: 0.92,
            }}
          >
            THE<br />
            <span
              style={{
                background: "linear-gradient(135deg, #ffffff 20%, rgba(255,255,255,0.55) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              FEED
            </span>
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #a855f7 0%, #38bdf8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              IS YOURS.
            </span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-base md:text-lg font-medium mb-8 max-w-xs"
            style={{
              color: "rgba(255,255,255,0.42)",
              letterSpacing: "-0.01em",
              lineHeight: 1.5,
            }}
          >
            Upload to IPFS. Earn on-chain tips.
            <br />
            Your ENS is your identity — forever.
          </motion.p>

          {/* CTA ROW */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.52 }}
            className="flex items-center gap-3 flex-wrap"
          >
            {/* Primary CTA */}
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button
                  onClick={openConnectModal}
                  className="relative flex items-center gap-2.5 rounded-xl overflow-hidden group"
                  style={{
                    padding: "13px 26px",
                    background: "#ffffff",
                    color: "#03050e",
                    fontWeight: 700,
                    fontSize: 14,
                    letterSpacing: "-0.01em",
                  }}
                >
                  <Play size={14} fill="#03050e" style={{ color: "#03050e" }} />
                  <span>Connect Wallet</span>
                  {/* Hover gradient wash */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{
                      background: "linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(56,189,248,0.12) 100%)",
                    }}
                  />
                </button>
              )}
            </ConnectButton.Custom>

            {/* Secondary CTA */}
            <button
              onClick={onBrowse}
              className="flex items-center gap-2 group"
              style={{
                padding: "13px 22px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                color: "rgba(255,255,255,0.6)",
                fontWeight: 600,
                fontSize: 14,
                letterSpacing: "-0.01em",
              }}
            >
              <span>Browse Feed</span>
              <ArrowRight
                size={13}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </button>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-wrap gap-2 mt-7"
          >
            {["IPFS Storage", "ENS Identity", "On-Chain Tips", "No Censorship"].map((feat) => (
              <span
                key={feat}
                className="text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                {feat}
              </span>
            ))}
          </motion.div>
        </div>

        {/* RIGHT — Video Mosaic */}
        <div className="hidden md:flex flex-col justify-center py-6 gap-3 overflow-hidden">
          {/* Row 1: Full-width featured card */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <VideoCard card={CARDS[0]} height={170} />
          </motion.div>

          {/* Row 2: Two equal cards */}
          <div className="grid grid-cols-2 gap-3">
            {[CARDS[1], CARDS[2]].map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.65, delay: 0.35 + i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <VideoCard card={card} height={130} />
              </motion.div>
            ))}
          </div>

          {/* Row 3: 1/3 + 2/3 split */}
          <div className="grid grid-cols-3 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.52, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <VideoCard card={CARDS[3]} height={105} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="col-span-2"
            >
              <VideoCard card={CARDS[4]} height={105} />
            </motion.div>
          </div>
        </div>
      </main>

      {/* ── BOTTOM TICKER ────────────────────────────────────── */}
      <div
        className="relative z-20 flex-shrink-0 overflow-hidden"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(255,255,255,0.015)",
          backdropFilter: "blur(12px)",
        }}
      >
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          className="flex items-center whitespace-nowrap py-3"
          style={{ width: "max-content" }}
        >
          {TICKER.map((item, i) => (
            <span key={i} className="flex items-center">
              <span
                className="text-[10px] font-semibold tracking-[0.18em] uppercase px-6"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                {item}
              </span>
              {/* Separator dot */}
              <span
                className="w-1 h-1 rounded-full flex-shrink-0"
                style={{
                  background:
                    i % 3 === 0
                      ? "rgba(168,85,247,0.5)"
                      : i % 3 === 1
                      ? "rgba(56,189,248,0.5)"
                      : "rgba(245,158,11,0.5)",
                }}
              />
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// ─── Video Card Component ───────────────────────────────────────────────────

function VideoCard({ card, height }: { card: (typeof CARDS)[0]; height: number }) {
  return (
    <div
      className="relative w-full rounded-xl overflow-hidden group cursor-pointer"
      style={{
        height,
        background: card.bg,
        boxShadow: `0 0 0 1px rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.6)`,
      }}
    >
      {/* Card inner glow */}
      <div
        className="absolute inset-0 opacity-60 group-hover:opacity-80 transition-opacity duration-300"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 65% 35%, ${card.glow} 0%, transparent 70%)`,
        }}
      />

      {/* Accent bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, ${card.accentBar}, transparent)` }}
      />

      {/* Top-left: EV badge */}
      <div className="absolute top-2.5 left-2.5">
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #a855f7 0%, #38bdf8 100%)" }}
        >
          <Play size={9} fill="#03050e" style={{ color: "#03050e" }} className="ml-px" />
        </div>
      </div>

      {/* Top-right: play button on hover */}
      <div
        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 scale-90 group-hover:scale-100"
        style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
      >
        <Play size={10} fill="white" style={{ color: "white" }} className="ml-0.5" />
      </div>

      {/* Hover: subtle border ring */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ boxShadow: `inset 0 0 0 1px ${card.accentBar}40` }}
      />
    </div>
  );
}
