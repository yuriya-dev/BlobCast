# BlobCast Architecture

> BlobCast — Own your posts forever.
> A decentralized social platform powered by Walrus decentralized storage and Sui blockchain infrastructure via Tatum RPC.

---

# 1. Overview

BlobCast is a decentralized social protocol designed for permanent, censorship-resistant social publishing.

The platform enables users to:

* Publish immutable posts
* Store media permanently using Walrus
* Own their identity through Sui wallets
* Verify authorship on-chain
* Interact through decentralized social primitives

BlobCast combines:

* Walrus decentralized blob storage
* Sui blockchain
* Tatum enterprise-grade RPC infrastructure
* Modern web architecture
* AI-powered social discovery

The application is optimized for:

* Scalability
* Low-cost storage
* Fast user experience
* Permanent media persistence
* Hybrid on-chain/off-chain indexing

---

# 2. High-Level Architecture

```txt
 ┌──────────────────────────────┐
 │          Frontend            │
 │        Next.js App           │
 └──────────────┬───────────────┘
                │
                ▼
 ┌──────────────────────────────┐
 │        API Gateway           │
 │      Hono / Fastify API      │
 └───────┬─────────┬────────────┘
         │         │
         │         │
         ▼         ▼
 ┌────────────┐  ┌─────────────────┐
 │   Walrus   │  │  Tatum Sui RPC  │
 │ Blob Store │  │    Sui Nodes    │
 └────────────┘  └─────────────────┘
         │                  │
         ▼                  ▼
 ┌────────────────────────────────┐
 │          Sui Blockchain        │
 │ Ownership / Hash / References  │
 └────────────────────────────────┘
                │
                ▼
 ┌────────────────────────────────┐
 │      PostgreSQL + Redis        │
 │  Feed Cache / Search / Trends  │
 └────────────────────────────────┘
```

---

# 3. Core Philosophy

BlobCast separates:

* Ownership layer
* Storage layer
* Application layer

This ensures:

* Decentralized persistence
* Fast UX
* Scalable architecture
* Low blockchain costs

---

# 4. Technology Stack

## Frontend

| Technology    | Purpose            |
| ------------- | ------------------ |
| Next.js 15    | Frontend framework |
| React         | UI rendering       |
| Tailwind CSS  | Styling            |
| Framer Motion | Animations         |
| shadcn/ui     | Components         |
| Zustand       | State management   |

---

## Backend

| Technology     | Purpose           |
| -------------- | ----------------- |
| Node.js        | Runtime           |
| Hono / Fastify | API framework     |
| PostgreSQL     | Metadata indexing |
| Redis          | Feed caching      |
| Prisma         | ORM               |

---

## Blockchain

| Technology | Purpose                    |
| ---------- | -------------------------- |
| Sui        | Ownership & verification   |
| Tatum RPC  | Reliable Sui RPC access    |
| Walrus     | Decentralized blob storage |

---

## AI Layer

| Technology         | Purpose               |
| ------------------ | --------------------- |
| Gemini / Vertex AI | Content summarization |
| Embedding model    | Semantic search       |
| Moderation model   | Spam detection        |

---

# 5. Storage Architecture

BlobCast uses a hybrid decentralized storage model.

## On-chain Data

Stored on Sui:

* Post ownership
* Blob references
* Hash verification
* Timestamps
* Wallet identity

## Walrus Blob Storage

Stored on Walrus:

* Post content
* Images
* Videos
* Avatars
* Profile banners
* Thread archives

## Off-chain Database

Stored in PostgreSQL:

* Feed indexes
* Trending scores
* Search indexes
* Notification states
* Analytics cache

---

# 6. Post Lifecycle

## Step 1 — User Creates Post

User submits:

* text
* media
* metadata

Example:

```json
{
  "text": "Hello decentralized world",
  "media": ["image.png"],
  "visibility": "public"
}
```

---

## Step 2 — Blob Packaging

Backend converts content into:

```json
{
  "author": "wallet_address",
  "timestamp": 1740000000,
  "content": "Hello decentralized world",
  "media": [
    {
      "type": "image",
      "url": "walrus_blob_url"
    }
  ]
}
```

---

## Step 3 — Upload to Walrus

Blob uploaded to Walrus:

```txt
walrus://blob/8x91akjs...
```

Returned:

* blob ID
* content hash
* storage metadata

---

## Step 4 — On-chain Registration

Backend writes:

* blob hash
* ownership proof
* walrus reference

to Sui blockchain via Tatum RPC.

Example:

```txt
PostObject {
  owner,
  blob_hash,
  walrus_blob_id,
  created_at
}
```

---

## Step 5 — Feed Distribution

Indexer:

* updates PostgreSQL
* updates Redis cache
* refreshes trending engine

Frontend receives:

* instant feed update
* decentralized content references

---

# 7. Wallet Authentication

BlobCast uses wallet-based authentication.

Supported:

* Sui Wallet
* Suiet
* Nightly

Authentication flow:

1. Connect wallet
2. Sign nonce
3. Backend verifies signature
4. JWT session created

No passwords required.

---

# 8. Feed System

BlobCast feed combines:

* decentralized persistence
* centralized performance optimization

## Feed Pipeline

```txt
Walrus Blob
    ↓
Indexer Worker
    ↓
PostgreSQL
    ↓
Redis Feed Cache
    ↓
Frontend Feed API
```

---

# 9. AI Features

## AI Thread Summaries

Long discussions summarized automatically.

## Semantic Search

Users can search:

* topics
* conversations
* hashtags
* creator niches

## Moderation Layer

AI flags:

* spam
* phishing
* duplicate scams

without deleting immutable content.

Instead:

* content gets hidden from UI
* original blob remains verifiable

---

# 10. Smart Contract Architecture

## Modules

### Profile Module

Handles:

* usernames
* avatars
* profile metadata

### Post Module

Handles:

* post registration
* ownership
* timestamps

### Interaction Module

Handles:

* likes
* reposts
* tipping

---

# 11. Security Architecture

## Security Measures

* Signed wallet authentication
* Content hash verification
* Rate limiting
* Redis anti-spam
* AI moderation
* Transaction replay protection

---

# 12. Scalability Strategy

## Why Hybrid Architecture?

Fully on-chain social platforms are:

* expensive
* slow
* difficult to scale

BlobCast uses:

* blockchain for trust
* Walrus for permanence
* PostgreSQL for performance

This achieves:

* low latency
* low gas cost
* decentralized ownership

---

# 13. Mainnet Readiness

BlobCast is designed for:

* Sui Mainnet deployment
* production-grade RPC access via Tatum
* decentralized media persistence via Walrus

---

# 14. Deployment Architecture

## Infrastructure

```txt
Frontend
 └── Vercel

Backend API
 └── Railway / Fly.io

PostgreSQL
 └── Neon / Supabase

Redis
 └── Upstash

Walrus
 └── Decentralized Storage

Sui RPC
 └── Tatum Infrastructure
```

---

# 15. Future Roadmap

## Phase 1

* Social feed
* Media upload
* Wallet auth
* Profiles

## Phase 2

* AI summarization
* Tipping
* Trending algorithm
* Notifications

## Phase 3

* Fully decentralized indexing
* Community moderation
* Tokenized creator economy
* Cross-app social graph

---

# 16. Competitive Advantage

BlobCast is not a traditional social media clone.

It is:

* a permanent social publishing protocol
* decentralized media infrastructure
* wallet-native social identity layer

Key advantages:

* Immutable social history
* User-owned content
* Verifiable authorship
* Decentralized storage
* Mainnet-ready architecture

---

# 17. Conclusion

BlobCast demonstrates how decentralized storage and blockchain infrastructure can power scalable social applications without sacrificing performance.

By combining:

* Walrus decentralized storage
* Tatum Sui RPC infrastructure
* modern web technologies
* AI-enhanced discovery

BlobCast creates a new model for permanent, user-owned social media.

---

# Tagline

> BlobCast — Own your posts forever.
