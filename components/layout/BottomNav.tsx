"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Home, MessageCircle, Plus, User, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "wagmi";

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/discover", icon: Compass, label: "Discover" },
  { href: "/upload", icon: Plus, label: "Upload", special: true },
  { href: "/messages", icon: MessageCircle, label: "DMs" },
  { href: "/profile", icon: User, label: "Profile" },
];

interface BottomNavProps {
  onUploadClick?: () => void;
  onProfileClick?: (address: string) => void;
}

export function BottomNav({ onUploadClick, onProfileClick }: BottomNavProps) {
  const pathname = usePathname();
  const { address } = useAccount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="bg-glass border-t border-eth-border">
        <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label, special }) => {
            if (special) {
              return (
                <button
                  key={href}
                  onClick={onUploadClick}
                  className="tap-highlight-none flex-1 flex justify-center"
                >
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className="relative"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-cyan via-neon-purple to-neon-pink flex items-center justify-center shadow-neon">
                      <Plus size={22} className="text-eth-dark font-bold" strokeWidth={3} />
                    </div>
                    {/* Glow ring */}
                    <div className="absolute inset-0 rounded-2xl bg-neon-cyan/20 blur-md -z-10 animate-pulse" />
                  </motion.div>
                </button>
              );
            }

            const isActive = pathname === href ||
              (href === "/profile" && (pathname === "/profile" || pathname.startsWith("/profile/")));

            if (href === "/profile") {
              return (
                <button
                  key={href}
                  onClick={() => address && onProfileClick?.(address)}
                  className="tap-highlight-none flex-1 flex flex-col items-center justify-center gap-0.5 h-full"
                >
                  <motion.div
                    whileTap={{ scale: 0.85 }}
                    className="flex flex-col items-center gap-0.5 transition-all duration-200 text-muted-foreground"
                  >
                    <Icon size={22} />
                    <span className="text-[11px] font-black tracking-tight">{label}</span>
                  </motion.div>
                </button>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                className="tap-highlight-none flex-1 flex flex-col items-center justify-center gap-0.5 h-full"
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className={cn(
                    "flex flex-col items-center gap-0.5 transition-all duration-200",
                    isActive ? "text-neon-cyan" : "text-muted-foreground"
                  )}
                >
                  <div className="relative">
                    <Icon
                      size={22}
                      className={cn(
                        "transition-all duration-200",
                        isActive && "drop-shadow-[0_0_6px_rgba(0,245,255,0.8)]"
                      )}
                    />
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neon-cyan"
                      />
                    )}
                  </div>
                  <span className="text-[11px] font-black tracking-tight">{label}</span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
