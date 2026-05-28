# BlobCast — Project TODOS & Stage-by-Stage Roadmap

Welcome to the BlobCast development tracker. This tracker organizes the next development milestones into clear, sequential stages representing the pathway to a fully decentralized, production-ready Web3 social network.

---

## 🚀 Completed Milestones (100% Completed)

### 1. Cyberpunk Frontend Client (`client/`)
- [x] **Immersive Landing Portal**: High-resolution cyber hero landing page with Web3 action gates (`client/src/app/page.tsx`).
- [x] **Portal Feed Dashboard**: Three-column cyber feed rendering permanent casts, search filtration, and real-time trending widgets.
- [x] **Wallet & Profiles Integration**: Complete Web3 profile hub supporting banner overlays, verified badges, and Walrus metadata schema registration.
- [x] **My Wallet Telemetry**: Dashboard containing connected wallet details, 7-day revenue growth analytics, and tipping verification logs.
- [x] **Sui Dapp-Kit integration**: Installed and configured `@mysten/dapp-kit` for instant wallet handshakes.

### 2. Move Smart Contracts (`move/`)
- [x] **Profile Registration Module** (`profile.move`): Decentralized handle mapping and Walrus reference storage.
- [x] **Casting Registry Module** (`post.move`): On-chain registration of Walrus blob IDs and ownership verification.
- [x] **Interaction Module** (`interaction.move`): Shared likes registries and decentralized follow systems.
- [x] **Tipping Core Module** (`tipping.move`): Smart contract coordinating secure Sui tips and emitting real-time event streams.

### 3. Backend & Indexer Infrastructure (`server/`)
- [x] **Prisma 7 Database Schema**: Created PostgreSQL relational schemas with strict maps for users, posts, likes, comments, and notifications.
- [x] **Centralized Database Client**: Built unified `db.ts` utilizing `PrismaPg` and `pg.Pool` connection pool for secure Supabase integration.
- [x] **Sui Event Indexer**: Active, high-availability event parsing daemon powered by Tatum SUI RPC gateways, tracking checkpoints and syncing state.
- [x] **Supabase DB Sync & Seed**: Pushed schema definitions successfully to the live Supabase cloud database and completed seeding.

---

## 🛠️ Next Development Milestones (Stage-by-Stage)

### 📈 Stage 1: Full Client-to-API Integration (Status: ✅ COMPLETED)
*Goal: Link the Next.js frontend state management to the active Express backend REST APIs running on port 8080 instead of in-memory fallbacks.*

- [x] **Configure Base API Gateways**: Setup unified Axios/fetch helper pointing to `http://localhost:8080/api` in frontend configurations.
- [x] **Connect Post Timeline Feed**: Replace client-side mock lists with active backend GET queries (`/api/posts?page=1&limit=15`).
- [x] **Connect User Profile Sync**: Wire up the visual edit profile modal to trigger REST POST actions (`/api/users`) to update Supabase.
- [x] **Synchronize System Drawer Telemetry**: Feed real-time indexer and notification events from the server database directly to the feed logs panel.

### 🪙 Stage 2: Live Move Smart Contract Wallet Interactions (Status: 📅 Planned)
*Goal: Sign and execute actual Sui Devnet/Testnet transactions using the connected browser extension wallet.*

- [ ] **Implement Sui Tipping Actions**: Connect the "Tip Creator" button to `@mysten/dapp-kit`'s transaction block executor to transfer SUI on-chain.
- [ ] **On-chain Cast Registries**: Sign Move transactions when composing casts, pinning their ownership and Walrus hashes directly to the Sui ledger.
- [ ] **Listen & Index Live Events**: Ensure the backend `indexer.ts` catches these live tipping and registration events and pushes verified state modifications to Supabase.

### 🌊 Stage 3: Decentralized Walrus Media Aggregation (Status: 📅 Planned)
*Goal: Move from mock asset caching to permanent, raw media storage across the worldwide Walrus protocol shard networks.*

- [ ] **Establish Walrus Gateway URLs**: Define production Aggregator and Publisher nodes (e.g., `https://publisher.walrus.space`) in environment files.
- [ ] **JSON Schema Packaging**: Finalize serialization of decentralized social posts (wrapping text, hashtags, media arrays) into formal JSON formats.
- [ ] **Reed-Solomon Shard Verifications**: Render real-time visual telemetry showing media files reconstructing from distributed shard blocks.

### 🛡️ Stage 4: Production Hardening & Optimization (Status: 📅 Planned)
*Goal: Secure database pools, set up index keys, and prepare for production hosting.*

- [ ] **Enable Prisma Accelerate/Direct Connections**: Configure connection pool thresholds to handle heavy social load spikes.
- [ ] **Database Index Optimization**: Add composite index keys on `wallet_address`, `author_id`, and `created_at` columns inside the database schema for sub-millisecond queries.
- [ ] **Production Build & Deploy**: Execute client Next.js output optimizations and compile server TypeScript to clean production JavaScript.
