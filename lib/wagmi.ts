"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, base, sepolia, baseSepolia } from "wagmi/chains";
import { http } from "wagmi";

const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID";

export const wagmiConfig = getDefaultConfig({
  appName: "ethvideos.eth",
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [mainnet, base, sepolia, baseSepolia],
  transports: {
    [mainnet.id]: http(
      process.env.NEXT_PUBLIC_ALCHEMY_RPC_MAINNET ||
        "https://eth-mainnet.g.alchemy.com/v2/demo"
    ),
    [base.id]: http(
      process.env.NEXT_PUBLIC_ALCHEMY_RPC_BASE ||
        "https://base-mainnet.g.alchemy.com/v2/demo"
    ),
    [sepolia.id]: http("https://eth-sepolia.g.alchemy.com/v2/demo"),
    [baseSepolia.id]: http("https://base-sepolia.g.alchemy.com/v2/demo"),
  },
  ssr: false,
});
