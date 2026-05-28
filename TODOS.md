# BlobCast — Project TODOS Tracker

Welcome to the BlobCast development tracker. In accordance with architectural and user requirements, we have prioritized and **completed 100% of the frontend features** (including immersive cyber mechanics, wallet configurations, real-time filters, live diagnostic telemetry, and social layout panels). We are now prepared for Move smart contract deployments and relational indexers.

---

## 🚀 Frontend Feature Checklist (Status: 100% COMPLETED)

### 1. Portal & Entry Point (Status: ✅ COMPLETED)
- [x] Immersive Cyberpunk Landing Page (`client/src/app/page.tsx`)
- [x] Multi-resolution hero grids, visual details, and action gates
- [x] Connected Wallet wrapper gates using `@mysten/dapp-kit`
- [x] Feature highlight card grid with custom lucide icons

### 2. Core DecentSocial Feed (`client/src/app/feed/page.tsx`) (Status: ✅ COMPLETED)
- [x] Three-column layout (Left Sidebar Nav, Middle Feed, Right Trending stats)
- [x] Reusable `PostCard` rendering text, hashtag tags, Walrus JSON blob details, and tipping controls
- [x] Reusable `PostComposer` serializing schema schemas and executing mock Walrus publisher node uploads
- [x] SUI tipping with real-time dynamic canvas-confetti particle explosions
- [x] "Simulated Backend Outage Mode" dynamically rerouting queries exclusively through direct decentralized Walrus storage aggregators
- [x] Real-time visual search and hashtag filtration bar with interactive clear action filters
- [x] Immersive slide-out **System Activity Logs / Notifications Drawer** rendering tip verifications, like signatures, and indexer schemas

### 3. User Identity & Profile System (`client/src/app/profile/page.tsx`) (Status: ✅ COMPLETED)
- [x] Premium visual profile hub featuring banner overlays, rotatable avatars, and verified badges
- [x] Dynamic stats tracker computing Cast metrics, Followers count, and SUI Tips Received
- [x] Interactive "Edit Profile" modal compiling visual schemas and publishing profile JSON schemas directly to Walrus storage
- [x] Profile casting timeline tabbed filters (Casts, Media, and Likes history)

### 4. Developer & Network Diagnostics Console (`client/src/app/dev/page.tsx`) (Status: ✅ COMPLETED)
- [x] Live Tatum RPC Sui network roundtrip latency ping monitoring and area chart rendering
- [x] Walrus Shards Inspector mapping Reed-Solomon 120-shard distribution registries across worldwide server nodes
- [x] Interactive simulated storage node outage toggle demonstrating real-time Reed-Solomon math-based file reconstruction and recovery thresholds

---

## 🛠️ Backend & On-Chain Roadmap (Status: 🕒 UPCOMING)

### 1. Sui Move Smart Contracts
- [ ] **Profile Package** (`profile.move`): registration of decentralized custom usernames, handles, and Walrus profile blob references
- [ ] **Post Package** (`post.move`): on-chain registration of published Walrus blob IDs, hashes, and ownership verified objects
- [ ] **Interaction Package** (`interaction.move`): decentralized social primitives (Shared likes objects, follower networks)
- [ ] **Tipping Package** (`tipping.move`): smart contract facilitating secure creator tips transfers and emitting event streams

### 2. Off-chain Relational Indexer & Cache
- [ ] **PostgreSQL + Prisma**: relational indexer tracking Sui transaction events and updating metadata search tables
- [ ] **Redis**: distributed cache computing trending tags scoring algorithms and active user telemetry
