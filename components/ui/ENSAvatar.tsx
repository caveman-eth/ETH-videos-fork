"use client";

import { useState } from "react";
import { cn, getAddressColor, truncateAddress } from "@/lib/utils";

interface ENSAvatarProps {
  address?: string;
  ensName?: string;
  avatarUrl?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showRing?: boolean;
}

const SIZE_MAP = {
  xs: { container: "w-6 h-6", text: "text-[8px]" },
  sm: { container: "w-8 h-8", text: "text-xs" },
  md: { container: "w-10 h-10", text: "text-sm" },
  lg: { container: "w-14 h-14", text: "text-base" },
  xl: { container: "w-20 h-20", text: "text-xl" },
};

export function ENSAvatar({
  address,
  ensName,
  avatarUrl,
  size = "md",
  className,
  showRing = false,
}: ENSAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const { container, text } = SIZE_MAP[size];
  const color = address ? getAddressColor(address) : "#00f5ff";
  const initials = ensName
    ? ensName.slice(0, 2).toUpperCase()
    : address
    ? address.slice(2, 4).toUpperCase()
    : "??";

  const ringStyle = showRing
    ? { boxShadow: `0 0 0 2px ${color}66, 0 0 12px ${color}33` }
    : {};

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden flex-shrink-0",
        container,
        className
      )}
      style={ringStyle}
    >
      {avatarUrl && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={ensName || truncateAddress(address || "")}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center font-bold",
            text
          )}
          style={{
            background: `linear-gradient(135deg, ${color}33, ${color}11)`,
            border: `1px solid ${color}44`,
            color,
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

// Stacked avatars for "also liked by" etc.
export function AvatarStack({
  users,
  max = 4,
  size = "xs",
}: {
  users: Array<{ address: string; ensName?: string; avatarUrl?: string }>;
  max?: number;
  size?: "xs" | "sm";
}) {
  const visible = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className="flex items-center">
      {visible.map((user, i) => (
        <div
          key={user.address}
          className="relative"
          style={{ marginLeft: i > 0 ? "-6px" : 0, zIndex: visible.length - i }}
        >
          <ENSAvatar
            address={user.address}
            ensName={user.ensName}
            avatarUrl={user.avatarUrl}
            size={size}
            className="ring-1 ring-eth-dark"
          />
        </div>
      ))}
      {remaining > 0 && (
        <span className="ml-1 text-xs text-muted-foreground">
          +{remaining}
        </span>
      )}
    </div>
  );
}
