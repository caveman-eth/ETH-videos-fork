"use client";

import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { ProfilePage } from "@/components/profile/ProfilePage";
import { isValidEthereumAddress } from "@/lib/utils";

export function ProfileRouteClient({
  address,
  onBack,
}: {
  address: string;
  onBack?: () => void;
}) {
  if (!address || (!isValidEthereumAddress(address) && !address.endsWith(".eth"))) {
    return (
      <div className="flex items-center justify-center h-dvh bg-eth-dark">
        <p className="text-muted-foreground">Invalid address</p>
      </div>
    );
  }

  return (
    <main className="bg-eth-dark min-h-dvh">
      <Header title="Profile" onHome={onBack} />
      <div className="pt-14 overflow-y-auto h-dvh">
        <ProfilePage address={address} />
      </div>
      <BottomNav />
    </main>
  );
}
