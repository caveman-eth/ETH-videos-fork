"use client";

import { motion } from "motion/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Bell, Search, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  transparent?: boolean;
  showSearch?: boolean;
  title?: string;
  onHome?: () => void;
}

export function Header({
  transparent = false,
  showSearch = false,
  title,
  onHome,
}: HeaderProps) {
  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-40 safe-top",
        transparent ? "bg-transparent" : "bg-glass border-b border-eth-border"
      )}
    >
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        {/* Logo / Title / Back */}
        <div className="flex items-center gap-2">
          {onHome ? (
            <button
              onClick={onHome}
              className="flex items-center gap-1 text-muted-foreground hover:text-white transition-colors"
            >
              <ChevronLeft size={18} />
              <span className="text-sm font-semibold">Home</span>
            </button>
          ) : title ? (
            <span className="font-bold text-white text-lg">{title}</span>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
                <span className="text-xs font-black text-eth-dark">EV</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {showSearch && (
            <button className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
              <Search size={18} />
            </button>
          )}
          <button className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-white transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-neon-pink" />
          </button>
          <ConnectButton
            showBalance={false}
            chainStatus="none"
            accountStatus={{
              smallScreen: "avatar",
              largeScreen: "address",
            }}
          />
        </div>
      </div>
    </header>
  );
}
