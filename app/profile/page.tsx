"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ProfileRouteClient } from "./[address]/ProfileRouteClient";

function ProfilePageInner() {
  const searchParams = useSearchParams();
  const address = searchParams.get("address") || "";
  return <ProfileRouteClient address={address} />;
}

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfilePageInner />
    </Suspense>
  );
}
