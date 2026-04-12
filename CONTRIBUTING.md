# Contributing to ethvideos.eth

Thanks for your interest in contributing! ethvideos.eth is a decentralized short-form video platform built on Ethereum. All contributions — bug fixes, features, and ideas — are welcome.

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Open Issues & Good First Tasks](#open-issues--good-first-tasks)
- [Code Style](#code-style)
- [Deployment](#deployment)

---

## Project Overview

ethvideos.eth is a fully decentralized video platform:

- **Identity** — ENS names as usernames, EFP for social graph
- **Storage** — Videos pinned permanently to IPFS via Pinata; transcoded via Livepeer
- **On-chain** — Likes, tips (ETH + USDC), and video posts recorded on Ethereum mainnet
- **Messaging** — End-to-end encrypted DMs via XMTP
- **Hosting** — Frontend deployed to IPFS and served via ENS contenthash (`app.ethvideos.eth`)

No backend, no database, no central server.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router (static export → IPFS) |
| Wallet | wagmi v2 + RainbowKit + viem |
| Video | Livepeer (upload + HLS playback via hls.js) |
| Storage | Pinata / IPFS |
| Indexing | The Graph (subgraph for on-chain events) |
| Messaging | XMTP browser SDK |
| Social | EFP (Ethereum Follow Protocol) |
| Styling | Tailwind CSS + Framer Motion |
| Contracts | Solidity 0.8.24 (Foundry) |
| Language | TypeScript |

**Mainnet contracts (Ethereum):**
- `VideoPost`: `0x06D46d664130A2A210a056204d93B41549081776`
- `TipContract`: `0x5E6e4f7232D824588B354a4748aE8379BF58EE9a`
- `Reactions`: `0xae3FF6C0FD07005a0ef16E83572bC68098be4fd3`

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/RWA-ID/ETH-videos.git
cd ETH-videos
npm install
```

### 2. Set up environment variables

Copy the example and fill in your own keys:

```bash
cp .env.example .env.local
```

Required keys:

```env
# Livepeer — https://livepeer.studio
NEXT_PUBLIC_LIVEPEER_API_KEY=

# Pinata — https://pinata.cloud
NEXT_PUBLIC_PINATA_JWT=
NEXT_PUBLIC_PINATA_GATEWAY=

# WalletConnect — https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=

# Alchemy (for ENS resolution) — https://alchemy.com
NEXT_PUBLIC_ALCHEMY_API_KEY=

# The Graph subgraph URL
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/1747813/ethvideos-eth/v0.0.1
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How to Contribute

### Reporting bugs

Open a GitHub Issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Browser + wallet (e.g. Chrome + MetaMask, Safari + WalletConnect)

### Submitting a pull request

1. Fork the repo and create a branch: `git checkout -b fix/your-bug` or `feat/your-feature`
2. Make your changes
3. Run `npx tsc --noEmit` to check for TypeScript errors
4. Open a PR against `main` with a clear description of what changed and why

Keep PRs focused — one fix or feature per PR makes review much faster.

---

## Open Issues & Good First Tasks

These are known bugs and features actively wanted:

### Bugs
- **Desktop feed width** — The feed should be constrained to ~520px centered on desktop (≥768px). The `.feed-inner` CSS class in `globals.css` is supposed to handle this but the constraint isn't visibly taking effect. Need to inspect DevTools on the live IPFS site and trace why.
- **Profile video thumbnails** — Livepeer VOD thumbnails (`keyframe_0.png`) take time to generate after upload. Profile grid cards appear empty until thumbnails are ready. Could add a polling mechanism or fallback placeholder.

### Features
- **Profile video grid + modal** — Profile page needs a 3-column thumbnail grid. Clicking a thumbnail should open an inline video player modal. The modal must use `position: fixed` centering via a `div.flex.items-center.justify-center` wrapper — do NOT put `transform: translate(-50%,-50%)` directly on a `motion.div` that also animates `scale`, as Framer Motion overrides the `transform` style prop.
- **Video captions in subgraph** — The `VideoPosted` on-chain event doesn't emit the caption string, so it's always empty in the subgraph. Could store captions in IPFS metadata and resolve them client-side from the metadata CID.
- **Following feed** — The "Following" tab queries EFP for who the connected user follows, then filters the subgraph for those addresses. Currently works but needs more testing.
- **Discover page** — Trending/discovery feed based on on-chain reaction counts.
- **Comments** — On-chain or IPFS-based comment system (contract exists, UI needs work).
- **Mobile upload UX** — iOS re-encodes HEVC → H.264 via the file picker, inflating file sizes ~2x. Could warn the user or add client-side compression.
- **ENS avatar on video cards** — Video metadata from the subgraph doesn't include `posterEns` or `posterAvatar`. Cards fall back to address-based avatars. Could resolve ENS client-side per card or batch-resolve in the feed hook.

### Subgraph
The subgraph source is in `/subgraph`. It indexes `VideoPost` and `Reactions` events. Deployed on The Graph Studio. PRs to improve indexing (e.g. add comment events, tip totals) are welcome.

### Contracts
Contracts are in `/contracts` (Foundry). All are verified on Etherscan. Do not submit PRs that change deployed contract logic — only additive changes to new contracts.

---

## Code Style

- TypeScript strict mode — no `any`, no ignoring TS errors
- Tailwind for all styling — avoid inline styles except for dynamic values (colors from JS variables, etc.)
- Client components are `"use client"` at the top — keep server/client boundary clean
- No `next/image` — the app is a static IPFS export, use `<img>` instead
- No API routes at runtime — all data fetching is client-side (subgraph, IPFS, on-chain)

---

## Deployment

The app deploys to IPFS via a custom script:

```bash
node scripts/deploy-ipfs.mjs
```

This builds Next.js, assembles the static output, and uploads to Pinata. The resulting CID is set as the contenthash on `app.ethvideos.eth` via the ENS Manager.

Contributors don't need to deploy — just open a PR and the maintainer handles deployment.
