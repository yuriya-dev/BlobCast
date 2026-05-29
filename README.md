<div align="center">

# 🌊 BlobCast

### *Own your posts forever.*

**A decentralized social publishing protocol built on Sui blockchain, powered by Walrus permanent storage and Tatum enterprise-grade RPC infrastructure.**

[![Sui](https://img.shields.io/badge/Sui-Blockchain-4DA2FF?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PC9zdmc+)](https://sui.io)
[![Walrus](https://img.shields.io/badge/Walrus-Decentralized_Storage-00C9A7?style=for-the-badge)](https://walrus.xyz)
[![Tatum](https://img.shields.io/badge/Tatum-RPC_Infrastructure-7C3AED?style=for-the-badge)](https://tatum.io)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://typescriptlang.org)

</div>

---

## 📖 Project Description

BlobCast is a **decentralized social publishing protocol** that enables users to publish content permanently, verifiably, and censorship-resistant on the Sui blockchain.

Unlike traditional social media platforms that store content on centralized servers, BlobCast uses a **hybrid architecture**:
- **Walrus** for storing content (text, images, video) in a decentralized and permanent manner
- **Sui blockchain** for verifying content ownership and authenticity
- **Tatum RPC** as an enterprise-grade gateway to the Sui network
- **PostgreSQL + Redis** for fast feed performance and indexing

> Every post you create belongs to you forever — stored on Walrus, verified on Sui, and cannot be deleted by anyone.

---

## 🤔 Why Walrus?

Walrus is a decentralized blob storage built on top of Sui. BlobCast chose Walrus for the following reasons:

| Reason | Explanation |
|--------|-------------|
| **Permanence** | Content is encoded with Reed-Solomon erasure coding (120-shard distribution), ensuring data is stored permanently and fault-tolerantly |
| **Censorship Resistance** | No single entity can delete or censor stored content |
| **Cost Efficiency** | Blob storage costs are significantly lower compared to storing data directly on-chain in Sui |
| **Sui Native** | Walrus integrates natively with the Sui ecosystem — blob IDs and hashes can be referenced directly in Move smart contracts |
| **Content Integrity** | Every blob has a verifiable SHA-256 hash to ensure content has not been tampered with |

### What is stored in Walrus?

BlobCast stores all heavy content to Walrus:

- 📝 **Post content** — post text serialized to a JSON blob
- 🖼️ **Media images** — images attached to posts
- 🎬 **Videos** — video content from posts
- 👤 **Avatar & Profile Banner** — user profile photos and banners
- 💬 **Comments** — each comment has its own Walrus blob ID
- 🗂️ **Thread Archives** — archives of long discussion threads

Each entity above generates a **Walrus Blob ID** which is then stored as a reference in the Sui smart contract and PostgreSQL database.

**Example post blob structure:**
```json
{
  "author": "0x91ab3f...",
  "content": "Hello decentralized world!",
  "media": [
    { "type": "image", "blob": "walrus://8x7as..." }
  ],
  "timestamp": 1748500000
}
```

---

## 🤔 Why Tatum?

Tatum provides **enterprise-grade RPC infrastructure** for accessing the Sui blockchain. BlobCast chose Tatum for the following reasons:

| Reason | Explanation |
|--------|-------------|
| **High Availability** | Tatum runs dedicated Sui nodes with high uptime, avoiding rate-limiting from public endpoints |
| **Performance** | Lower latency compared to public Sui RPC for production workloads |
| **Reliability** | If Tatum goes down, the server automatically falls back to Sui public gateways — no single point of failure |
| **Testnet & Mainnet** | Support for both networks with a single API key, simplifying development and deployment |
| **API Key Auth** | Secure authenticated access to prevent abuse |

Tatum is used as an RPC gateway for:
- **Blockchain Indexer** — reading checkpoints and events from Sui
- **Wallet Authentication** — verifying transaction signatures
- **On-chain Registration** — writing blob references and ownership to Sui smart contracts

---

## 🏗️ System Architecture

```
┌──────────────────────────────────┐
│          Frontend (Next.js)      │
│   Feed · Posts · Profiles        │
│   Wallet Connect · Search        │
└──────────────┬───────────────────┘
               │ REST API
               ▼
┌──────────────────────────────────┐
│       Backend API (Express)      │
│  Auth · Posts · Users · Feed     │
└───────┬────────────┬─────────────┘
        │            │
        ▼            ▼
┌────────────┐  ┌──────────────────┐
│   Walrus   │  │  Tatum Sui RPC   │
│ Blob Store │  │  (Testnet/Main)  │
└────────────┘  └──────────────────┘
        │                │
        ▼                ▼
┌────────────────────────────────┐
│        Sui Blockchain          │
│  Ownership · Hash · Events     │
└────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│     BlobCast Indexer Daemon      │
│  Listens to Sui Events via Tatum │
└──────────┬───────────────────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
┌────────┐  ┌──────────┐
│ Prisma │  │  Redis   │
│  ORM   │  │  Cache   │
└────────┘  └──────────┘
    │
    ▼
┌─────────────┐
│  Supabase   │
│ (PostgreSQL)│
└─────────────┘
```

---

## 🛠️ Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16 | Frontend framework (App Router) |
| React | 19 | UI rendering |
| Tailwind CSS | 4 | Styling |
| Framer Motion | 12 | Animations & transitions |
| `@mysten/dapp-kit` | 1.0 | Sui wallet integration |
| `@mysten/sui` | 2.17 | Sui SDK (transactions, objects) |
| TanStack Query | 5 | Server state & data fetching |
| Zustand | — | Client state management |
| Recharts | 3 | Analytics charts |
| Radix UI | — | Accessible UI components |
| Lucide React | — | Icon library |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20 | Runtime |
| Express | 4 | REST API framework |
| Prisma | 7 | ORM & database migrations |
| PostgreSQL | — | Primary database (via Supabase) |
| Redis (ioredis) | 5 | Feed caching & trending engine |
| TypeScript | 5 | Type safety |

### Blockchain & Storage
| Technology | Purpose |
|------------|---------|
| Sui | Ownership verification, smart contracts |
| Walrus | Decentralized blob storage |
| Tatum | Enterprise Sui RPC gateway |
| Move | Smart contract language |

### Deployment
| Layer | Platform |
|-------|----------|
| Frontend | Vercel |
| Backend API | Railway / Fly.io |
| Database | Supabase (PostgreSQL) |
| Cache | Upstash (Redis) |
| Storage | Walrus (Decentralized) |
| RPC | Tatum Infrastructure |

---

## 📁 Repository Structure

```
BlobCast/
├── 📁 client/                    # Frontend Next.js App
│   ├── src/
│   │   ├── app/                  # Next.js App Router pages
│   │   │   ├── page.tsx          # Landing / Home page
│   │   │   ├── layout.tsx        # Root layout
│   │   │   ├── feed/             # Social feed
│   │   │   ├── posts/[id]/       # Post detail page
│   │   │   ├── profile/          # User profiles
│   │   │   ├── explore/          # Explore & trending
│   │   │   ├── search/           # Semantic search
│   │   │   ├── bookmarks/        # Saved posts
│   │   │   ├── messages/         # Direct messages
│   │   │   ├── wallet/           # Wallet dashboard
│   │   │   ├── login/            # Login page
│   │   │   └── register/         # Registration
│   │   ├── components/           # Reusable UI components
│   │   ├── hooks/                # Custom React hooks
│   │   └── lib/                  # Client-side utilities
│   ├── prisma/                   # Client-side Prisma schema
│   ├── .env                      # Client environment variables
│   └── package.json
│
├── 📁 server/                    # Backend Express API
│   ├── src/
│   │   ├── server.ts             # Entry point
│   │   ├── app.ts                # Express app setup
│   │   ├── indexer.ts            # 🔴 Sui blockchain indexer daemon
│   │   ├── controllers/
│   │   │   ├── authController.ts     # Wallet authentication
│   │   │   ├── postController.ts     # Posts CRUD & interactions
│   │   │   └── userController.ts     # User profiles
│   │   ├── routes/
│   │   │   ├── authRoutes.ts         # POST /auth/*
│   │   │   ├── postRoutes.ts         # GET/POST /posts/*
│   │   │   └── userRoutes.ts         # GET/PUT /users/*
│   │   ├── lib/
│   │   │   ├── tatum.ts              # 🔵 Tatum RPC client
│   │   │   ├── redis.ts              # Redis / in-memory cache
│   │   │   ├── db.ts                 # Prisma client singleton
│   │   │   └── auth.ts               # JWT utilities
│   │   ├── middleware/           # Express middlewares
│   │   ├── utils/                # Helper utilities
│   │   └── types/                # TypeScript type definitions
│   ├── prisma/                   # Prisma schema & migrations
│   ├── .env.example              # 📋 Environment template
│   └── package.json
│
├── 📁 move/                      # Sui Move Smart Contracts
│   ├── Move.toml                 # Package configuration
│   └── sources/
│       ├── profile.move          # User identity & avatars
│       ├── post.move             # Post ownership & Walrus refs
│       ├── interaction.move      # Likes, reposts, follows
│       ├── tipping.move          # SUI creator tipping
│       └── events.move           # On-chain event definitions
│
└── 📁 docs/                      # Technical documentation
    ├── architecture.md           # System architecture overview
    ├── smartcontract.md          # Smart contract design
    ├── design.md                 # UI/UX design specs
    ├── full_architecture.md      # Full architecture deep-dive
    └── quality-check.md          # Quality checklist
```

---

## 🔄 Post Workflow (Post Lifecycle)

```
1. User submits a post (text + media)
        │
        ▼
2. Frontend uploads media → Walrus
   → Receives walrus_blob_id + blob_hash
        │
        ▼
3. Backend POST /posts
   → Saves walrus_blob_id, blob_hash to Supabase
        │
        ▼
4. Smart Contract (Move) called via Sui SDK
   → Registers post ownership on-chain
   → Emits PostCreated event
        │
        ▼
5. BlobCast Indexer (via Tatum RPC) detects event
   → Syncs to PostgreSQL
   → Updates Redis trending cache
   → Emits real-time feed update
```

---

## 📜 Smart Contracts (Move)

BlobCast's contracts on Sui are designed to be **lightweight** — storing only minimal references:

| Module | Function |
|--------|----------|
| `profile.move` | User identity, username, avatar blob ID |
| `post.move` | Post ownership, Walrus blob reference, timestamps |
| `interaction.move` | Like, repost, follow |
| `tipping.move` | Direct SUI transfer to creator |
| `events.move` | Event definitions for the indexer |

Heavy content (text, images, video) is **never** stored on-chain — everything lives on Walrus.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- pnpm / npm
- Sui CLI (for deploying smart contracts)
- Tatum account for API key
- Supabase project (PostgreSQL)
- Redis (local or Upstash)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/BlobCast.git
cd BlobCast
```

### 2. Setup Backend

```bash
cd server

# Copy and fill in environment variables
cp .env.example .env

# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# (Optional) Seed initial data
npm run seed

# Start development server
npm run dev
```

Backend will run at `http://localhost:8080`

### 3. Setup Frontend

```bash
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run at `http://localhost:3000`

### 4. Deploy Smart Contracts (Optional)

```bash
cd move

# Deploy to Sui Testnet
sui client publish --gas-budget 100000000
```

---

## ⚙️ Environment Variables

### Server (`server/.env`)

```bash
# =========================================================================
# BlobCast — Server Environment Configuration
# =========================================================================

# --- 1. Server Settings ---
PORT=8080
NODE_ENV=development

# --- 2. Supabase Database Connection (PostgreSQL) ---
# Format: postgresql://[user]:[password]@[host]:[port]/[database]
DATABASE_URL="postgresql://postgres:[password]@[host].supabase.co:5432/postgres?schema=public"

# --- 3. Redis Cache Configuration ---
# If left empty, the server will use an in-memory Redis simulator (for development)
REDIS_URL="redis://localhost:6379"
# For Upstash: "rediss://:[password]@[host].upstash.io:6379"

# --- 4. Tatum Sui RPC Infrastructure ---
# If left empty, automatically falls back to public Sui gateways
TATUM_SUI_TESTNET_RPC="https://sui-testnet.node.tatum.io"
TATUM_SUI_MAINNET_RPC="https://sui-mainnet.node.tatum.io"
TATUM_API_KEY="your_tatum_api_key_here"
```

> **💡 Tip:** If `REDIS_URL` is left empty, the server uses a built-in in-memory cache simulator — ideal for development without Redis.
> If `TATUM_API_KEY` is left empty, the indexer automatically falls back to public Sui RPC endpoints.

### Client (`client/.env`)

```bash
# Prisma Database Connection for Client
DATABASE_URL="prisma+postgres://localhost:51213/?api_key=..."

# Tatum API Key for client-side Sui queries
TATUM_API_KEY="your_tatum_api_key_here"
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | Login with wallet signature |
| `POST` | `/auth/logout` | Logout & invalidate session |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/posts` | Fetch all posts (paginated) |
| `GET` | `/posts/:id` | Fetch single post by ID |
| `POST` | `/posts` | Create new post (auth required) |
| `POST` | `/posts/:id/like` | Toggle like on post |
| `POST` | `/posts/:id/repost` | Toggle repost |
| `POST` | `/posts/:id/comments` | Add comment (Walrus blob) |
| `GET` | `/posts/notifications` | Fetch latest indexer notifications |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users/:id` | Fetch user profile |
| `PUT` | `/users/:id` | Update profile |
| `GET` | `/users/:id/posts` | Fetch user's posts |
| `POST` | `/users/:id/follow` | Follow/unfollow user |
| `GET` | `/users/:id/followers` | Fetch followers list |

---

## 🌟 Key Features

- 🔐 **Wallet-native Authentication** — Login with only a Sui wallet, no password required
- 📝 **Permanent Posts** — Every post is stored permanently on Walrus
- ✅ **On-chain Authorship** — Content ownership verified on the Sui blockchain
- 📡 **Real-time Indexer** — Daemon that listens to Sui events via Tatum RPC
- 🔥 **Trending Engine** — Redis-powered trending hashtags and post scoring
- 🔁 **Social Interactions** — Like, repost, comment, follow
- 💰 **SUI Tipping** — Tip creators directly with SUI coin
- 🔖 **Bookmarks** — Save favorite posts
- 🔍 **Search** — Search posts, hashtags, and users
- 🛡️ **AI Moderation** — Flagged content is hidden in the UI; blobs remain immutable

---

## 📄 License

MIT License — see the [LICENSE](./LICENSE) file for details.

---

<div align="center">

**BlobCast** — *Own your posts forever.*

</div>