# ethvideos.eth

> The decentralized short-form video platform for Ethereum natives. TikTok meets true ownership.

**Live app:** https://app.ethvideos.eth.link (via ENS contenthash → IPFS)
**ENS name:** `app.ethvideos.eth`

---

## What is ethvideos.eth?

ethvideos.eth is a fully decentralized, short-form video platform built on Ethereum. Think TikTok — but where creators truly own their content, identities are ENS names, social graphs are on-chain via EFP, and tips go directly to creators with no middlemen.

**Key properties:**
- **Censorship-resistant** — videos stored permanently on IPFS, frontend deployed to IPFS
- **Self-sovereign identity** — your ENS name is your username
- **On-chain social graph** — follow/unfollow via Ethereum Follow Protocol
- **Direct creator monetization** — tip in ETH or USDC directly on-chain (5% platform fee)
- **Decentralized messaging** — creator DMs via XMTP protocol
- **No servers required** — the frontend is a static IPFS site; API routes are for dev only

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS + Framer Motion (motion/react) |
| Web3 | wagmi v2 + viem + RainbowKit |
| Identity | ENS (primary name + avatar via viem) |
| Auth | Sign-In with Ethereum (SIWE) |
| Video Upload | Livepeer Studio (TUS protocol upload + HLS transcoding) |
| Video Playback | hls.js + Livepeer CDN (`livepeercdn.studio`) |
| Storage | IPFS via Pinata (video metadata, thumbnails) |
| Indexer | TheGraph (subgraph at `ethvideos-eth/v0.0.1`) |
| Social Graph | Ethereum Follow Protocol (EFP) |
| Messaging | XMTP (`@xmtp/browser-sdk`) |
| Tips | ETH + USDC on Ethereum mainnet; USDC on Base |
| Contracts | Solidity 0.8.24 via Foundry |
| Fonts | Satoshi (Fontshare) + Inter |

---

## Deployed Contracts

### Ethereum Mainnet

| Contract | Address | Etherscan |
|----------|---------|-----------|
| VideoPost | `0x06D46d664130A2A210a056204d93B41549081776` | [View](https://etherscan.io/address/0x06D46d664130A2A210a056204d93B41549081776) |
| TipContract | `0x5E6e4f7232D824588B354a4748aE8379BF58EE9a` | [View](https://etherscan.io/address/0x5E6e4f7232D824588B354a4748aE8379BF58EE9a) |
| Reactions | `0xae3FF6C0FD07005a0ef16E83572bC68098be4fd3` | [View](https://etherscan.io/address/0xae3FF6C0FD07005a0ef16E83572bC68098be4fd3) |

### Base Mainnet

| Contract | Address | Basescan |
|----------|---------|---------|
| TipContract | `0x0d5e8E64919a86911b7175a92b88B3D2a51Ca2C4` | [View](https://basescan.org/address/0x0d5e8E64919a86911b7175a92b88B3D2a51Ca2C4) |

---

## TheGraph Subgraph

**Studio URL:** `https://api.studio.thegraph.com/query/1747813/ethvideos-eth/v0.0.1`

The subgraph indexes:
- `VideoPosted` events from `VideoPost.sol` (mainnet)
- `Liked` / `Unliked` events from `Reactions.sol` (mainnet)

**Schema entities:** `Video`, `Like`, `Creator`

The `/api/videos` route queries this subgraph. On IPFS (static export), the frontend queries TheGraph directly from the client.

---

## Smart Contract Overview

### `VideoPost.sol`
ERC-721 NFT contract. Each posted video mints a token. Emits `VideoPosted(tokenId, poster, ipfsCid, playbackId, caption)`.

### `TipContract.sol`
Accepts ETH and USDC tips. Routes 95% to the creator, 5% to the platform treasury. Supports Ethereum mainnet and Base.

### `Reactions.sol`
On-chain like/unlike tracking. Emits `Liked(user, videoCid)` and `Unliked(user, videoCid)`.

---

## Quick Start (Development)

```bash
git clone https://github.com/RWA-ID/ETH-videos
cd ETH-videos
cp .env.example .env.local   # fill in your API keys
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

Create `.env.local` with the following:

```env
# WalletConnect — https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Alchemy RPC
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_key

# Livepeer Studio — https://livepeer.studio
NEXT_PUBLIC_LIVEPEER_API_KEY=your_livepeer_key
LIVEPEER_API_KEY=your_livepeer_key

# Pinata IPFS — https://pinata.cloud
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud

# TheGraph subgraph
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/1747813/ethvideos-eth/v0.0.1

# Contract addresses (Ethereum mainnet)
NEXT_PUBLIC_VIDEO_POST_ADDRESS_MAINNET=0x06D46d664130A2A210a056204d93B41549081776
NEXT_PUBLIC_TIP_CONTRACT_ADDRESS_MAINNET=0x5E6e4f7232D824588B354a4748aE8379BF58EE9a
NEXT_PUBLIC_REACTIONS_ADDRESS_MAINNET=0xae3FF6C0FD07005a0ef16E83572bC68098be4fd3

# Contract addresses (Base)
NEXT_PUBLIC_TIP_CONTRACT_ADDRESS_BASE=0x0d5e8E64919a86911b7175a92b88B3D2a51Ca2C4

# Optional: XMTP notification bot
XMTP_BOT_PRIVATE_KEY=0x...
```

---

## Smart Contract Deployment

### Prerequisites

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup

cd contracts
forge install OpenZeppelin/openzeppelin-contracts
forge install foundry-rs/forge-std
```

### Deploy to Mainnet

```bash
# Set env vars
export MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
export PRIVATE_KEY=0x...
export ETHERSCAN_API_KEY=...

forge script script/Deploy.s.sol:Deploy \
  --rpc-url $MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### Deploy TipContract to Base

```bash
forge script script/Deploy.s.sol:DeployBase \
  --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

### Run tests

```bash
cd contracts && forge test -v
```

---

## TheGraph Subgraph Deployment

```bash
cd subgraph
npm install -g @graphprotocol/graph-cli

# Authenticate with TheGraph Studio
graph auth --studio YOUR_DEPLOY_KEY

# Build and deploy
graph codegen && graph build
graph deploy --studio ethvideos-eth
```

Choose version `v0.0.1` (or increment for updates). Wait for syncing to complete (100%) before publishing.

---

## IPFS Deployment

The frontend can be deployed to IPFS as a fully static site and pointed to via ENS contenthash.

```bash
# Build and upload to Pinata in one command
node scripts/deploy-ipfs.mjs
```

This will:
1. Build Next.js as a static export (`out/`)
2. Upload the entire `out/` folder to Pinata
3. Print the IPFS CID

Then set the contenthash on `app.ethvideos.eth`:
1. Go to [app.ens.domains/app.ethvideos.eth](https://app.ens.domains/app.ethvideos.eth)
2. Edit Records → Content Hash
3. Enter: `ipfs://YOUR_CID`

Users can access the app at:
- `app.ethvideos.eth` (via MetaMask's ENS resolver)
- `https://app.ethvideos.eth.limo` (public IPFS gateway)
- `https://ipfs.io/ipfs/YOUR_CID`

---

## How Video Upload Works

1. User selects video file → uploaded via **TUS protocol** to Livepeer Studio
2. Livepeer transcodes to HLS and assigns a `playbackId`
3. Thumbnail auto-generated at `livepeercdn.studio/hls/{playbackId}/thumbnails/keyframe_0.png`
4. Metadata JSON pinned to **IPFS via Pinata** with `caption`, `hashtags`, `playbackId`, `poster`
5. User calls `VideoPost.sol#postVideo(ipfsCid, playbackId, caption)` on-chain (mints ERC-721)
6. TheGraph indexes the `VideoPosted` event
7. Video appears in the feed

---

## How Tipping Works

1. User taps "Tip ETH" or "Tip USDC" on a video
2. Modal shows creator's ENS name + avatar
3. User selects amount and confirms the transaction
4. `TipContract.sol` receives the funds:
   - **95%** transferred directly to the creator
   - **5%** kept as platform fee
5. Supports **ETH** and **USDC** on Ethereum mainnet
6. Supports **USDC** on Base (lower gas fees)

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  ethvideos.eth (IPFS)                │
│              Next.js Static Export Site              │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────┼───────────────┐
         │           │               │
    ┌────▼────┐  ┌───▼───┐    ┌──────▼──────┐
    │ wagmi   │  │ XMTP  │    │  TheGraph   │
    │ viem    │  │ DMs   │    │  Subgraph   │
    │Rainbow  │  └───────┘    └──────┬──────┘
    └────┬────┘                      │
         │                    ┌──────▼──────┐
    ┌────▼────────────┐       │  Ethereum   │
    │ Ethereum mainnet│       │  Mainnet    │
    │                 │       │  Events     │
    │ • VideoPost.sol │       └─────────────┘
    │ • TipContract   │
    │ • Reactions.sol │       ┌─────────────┐
    └────┬────────────┘       │   Livepeer  │
         │                    │   Studio    │
    ┌────▼────────────┐       │ HLS + CDN   │
    │   Base mainnet  │       └─────────────┘
    │ • TipContract   │
    └─────────────────┘       ┌─────────────┐
                              │   Pinata    │
                              │    IPFS     │
                              │  Storage    │
                              └─────────────┘
```

---

## Folder Structure

```
ethvideos-eth/
├── app/
│   ├── api/                    # API routes (dev server only)
│   │   ├── comments/           # Comment storage
│   │   ├── videos/             # TheGraph video feed
│   │   ├── livepeer/           # Livepeer upload + asset proxy
│   │   ├── notifications/xmtp/ # XMTP notification bot
│   │   └── siwe/               # Sign-In with Ethereum
│   ├── discover/               # Trending / discovery page
│   ├── following/              # EFP-based following feed
│   ├── profile/[address]/      # ENS profile pages
│   └── video/[cid]/            # Individual video permalink
├── components/
│   ├── feed/                   # FeedContainer, VideoCard, FeedTabs
│   ├── layout/                 # Header, BottomNav
│   ├── messaging/              # DMButton, DMSheet (XMTP)
│   ├── onboarding/             # SplashScreen, OnboardingFlow
│   ├── profile/                # ProfilePage
│   ├── providers/              # wagmi, RainbowKit, Livepeer providers
│   ├── tips/                   # TipModal
│   ├── ui/                     # ENSAvatar, BackgroundLights, etc.
│   └── video/                  # VideoPlayer, CommentsSheet, UploadModal
├── contracts/
│   ├── src/
│   │   ├── VideoPost.sol       # ERC-721 video NFT
│   │   ├── TipContract.sol     # Direct creator tipping
│   │   └── Reactions.sol       # On-chain likes
│   ├── script/Deploy.s.sol
│   ├── test/VideoPost.t.sol
│   └── foundry.toml
├── subgraph/
│   ├── schema.graphql          # Video, Like, Creator entities
│   ├── subgraph.yaml           # Manifest (VideoPost + Reactions)
│   └── src/mappings.ts         # AssemblyScript event handlers
├── hooks/
│   ├── useENS.ts               # ENS name + avatar resolution
│   ├── useSIWE.ts              # SIWE auth flow
│   ├── useEFP.ts               # EFP follow stats + following check
│   ├── useFeed.ts              # Paginated video feed
│   ├── useTip.ts               # ETH + USDC tip transactions
│   └── useXMTP.ts              # XMTP client + conversations
├── lib/
│   ├── wagmi.ts                # wagmi config (mainnet + Base)
│   ├── contracts.ts            # Contract addresses + ABIs
│   ├── livepeer.ts             # Livepeer client
│   ├── ipfs.ts                 # IPFS fetch helpers
│   └── utils.ts                # formatCount, formatRelativeTime, etc.
├── scripts/
│   └── deploy-ipfs.mjs         # Build + upload to Pinata IPFS
├── public/
│   └── icons/                  # eth.svg, usdc.png, efp.svg
└── types/index.ts              # VideoMetadata, Comment, etc.
```

---

## Design System

The UI uses a **"Neon Underground"** aesthetic:

| Token | Value |
|-------|-------|
| Background | `#0a0a0f` (near-black) |
| Neon Cyan | `#00f5ff` |
| Neon Purple | `#bf5af2` |
| Neon Pink / Like | `#ff375f` |
| Neon Green | `#30d158` |
| Font | Satoshi (Fontshare) |
| Video container | `84dvh` rounded cards with scroll-snap |
| Action panel | Frosted glass pill (`rgba(6,8,20,0.62)` + `blur(28px)`) |

---

## License

MIT — see [LICENSE](./LICENSE)

---

## Contributing

PRs welcome. Please open an issue first for major changes.

Built with love for the Ethereum community.
