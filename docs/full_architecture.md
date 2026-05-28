# BlobCast — Production System Design Pack

> Own your posts forever.

---

# 1. Database Structure

BlobCast menggunakan hybrid architecture:

* Sui = ownership & verification
* Walrus = permanent content
* PostgreSQL = indexing & performance
* Redis = realtime feed cache

---

# PostgreSQL Schema

## users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    display_name TEXT,
    avatar_blob_id TEXT,
    banner_blob_id TEXT,
    bio TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## posts

```sql
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES users(id),
    sui_object_id TEXT,
    walrus_blob_id TEXT NOT NULL,
    blob_hash TEXT NOT NULL,
    content_type SMALLINT,
    visibility SMALLINT DEFAULT 0,
    reply_to UUID REFERENCES posts(id),
    repost_of UUID REFERENCES posts(id),
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    repost_count INTEGER DEFAULT 0,
    score FLOAT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## media

```sql
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id),
    media_type TEXT,
    walrus_blob_id TEXT,
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## follows

```sql
CREATE TABLE follows (
    follower_id UUID REFERENCES users(id),
    following_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY(follower_id, following_id)
);
```

---

## likes

```sql
CREATE TABLE likes (
    user_id UUID REFERENCES users(id),
    post_id UUID REFERENCES posts(id),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY(user_id, post_id)
);
```

---

## comments

```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id),
    author_id UUID REFERENCES users(id),
    walrus_blob_id TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## notifications

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    type TEXT,
    actor_id UUID REFERENCES users(id),
    post_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# Redis Structure

Used for:

* hot feeds
* trending cache
* rate limits
* realtime notifications

Keys:

```txt
feed:global
feed:user:{id}
trending:24h
notifications:{userId}
rate_limit:{wallet}
```

---

# 2. Walrus Blob Schema

---

# Post Blob Schema

```json
{
  "version": 1,
  "type": "post",
  "author_wallet": "0x91ab...",
  "created_at": 1748500000,
  "content": {
    "text": "Own your posts forever.",
    "hashtags": ["blobcast", "sui"],
    "mentions": []
  },
  "media": [
    {
      "type": "image",
      "blob_id": "walrus://8x91ak",
      "mime": "image/png",
      "width": 1920,
      "height": 1080
    }
  ],
  "metadata": {
    "language": "en",
    "client": "blobcast-web"
  }
}
```

---

# Profile Blob Schema

```json
{
  "username": "yuriya",
  "display_name": "Yuriya",
  "bio": "Building decentralized social.",
  "avatar_blob_id": "walrus://abc123",
  "banner_blob_id": "walrus://banner456",
  "links": {
    "website": "https://blobcast.xyz",
    "github": "https://github.com/blobcast"
  }
}
```

---

# AI Metadata Blob

```json
{
  "post_id": "uuid",
  "embedding": [0.12, 0.55, 0.91],
  "summary": "Discussion about decentralized social ownership.",
  "topics": ["web3", "social"],
  "sentiment": "positive"
}
```

---

# 3. Feed Algorithm

BlobCast feed = hybrid recommendation engine.

---

# Formula

```txt
FeedScore =
(recency * 0.4)
+ (engagement * 0.3)
+ (social_relation * 0.2)
+ (media_bonus * 0.05)
+ (ai_relevance * 0.05)
```

---

# Engagement Score

```txt
engagement =
(likes * 1)
+ (comments * 3)
+ (reposts * 5)
+ (tips * 8)
```

---

# Recency Decay

Use exponential decay:

```txt
score = engagement / (hours_since_post + 2)^1.5
```

---

# AI Relevance

Semantic embeddings:

* similar interests
* similar follows
* topic clustering

---

# Trending Algorithm

Trending uses:

* rapid engagement velocity
* repost growth
* wallet diversity
* unique interactions

Prevents:

* bot amplification
* fake engagement

---

# 4. 14-Day Roadmap

---

# Day 1

* Setup monorepo
* Configure Tatum RPC
* Configure Walrus SDK
* Setup Sui wallet auth

---

# Day 2

* Create smart contracts
* Deploy to testnet
* Setup PostgreSQL + Prisma

---

# Day 3

* Create post API
* Upload to Walrus
* Store Sui references

---

# Day 4

* Build feed UI
* Infinite scroll
* Post composer

---

# Day 5

* User profiles
* Avatar upload
* Follow system

---

# Day 6

* Likes
* Comments
* Reposts

---

# Day 7

* Redis caching
* Feed ranking
* Trending system

---

# Day 8

* Notifications
* Search
* Hashtags

---

# Day 9

* AI summaries
* Semantic embeddings
* AI moderation

---

# Day 10

* Tipping system
* Wallet balances
* Creator economy

---

# Day 11

* Performance optimization
* Lazy loading
* Blob prefetching

---

# Day 12

* Landing page
* Documentation
* Architecture diagrams

---

# Day 13

* Record demo video
* Stress test
* Bug fixes

---

# Day 14

* Final polish
* Deploy mainnet
* Submit hackathon

---

# 5. Cursor / Copilot Master Prompt

```txt
You are a senior Web3 fullstack engineer helping build BlobCast, a decentralized social platform powered by:
- Sui blockchain
- Walrus decentralized storage
- Tatum RPC infrastructure
- Next.js 15
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Redis

Architecture rules:
- Heavy content MUST be stored in Walrus
- Blockchain stores only references and hashes
- Use scalable production-ready architecture
- Optimize for hackathon demo quality
- Use clean modular structure
- Prioritize performance and readability
- Use server actions where appropriate
- Use App Router
- Use modern React patterns
- Generate production-quality code only

Design style:
- dark futuristic UI
- smooth animations
- minimal but premium
- inspired by Twitter + Linear + Farcaster

Always:
- explain folder structure
- include TypeScript types
- use best practices
- avoid placeholder code
```

---

# 6. Landing Page Copy

---

# Hero Section

## BlobCast

### Own your posts forever.

A decentralized social protocol powered by:

* Walrus decentralized storage
* Sui blockchain
* Tatum enterprise RPC infrastructure

Permanent posts.
Wallet-owned identity.
Immutable media.

---

# CTA Buttons

```txt
Start Posting
Explore Feed
View on GitHub
```

---

# Feature Section

## Permanent Social Publishing

Your posts live beyond platforms.

## Wallet-Native Identity

No passwords. No centralized accounts.

## Decentralized Media

Images and videos stored permanently with Walrus.

## Verifiable Ownership

Every post is cryptographically provable.

---

# Problem Statement

Traditional social platforms:

* control your content
* can delete your history
* monetize your data

BlobCast changes that.

---

# Footer Tagline

```txt
The decentralized social layer for the next internet.
```

---

# 7. Hackathon Presentation Deck

---

# Slide 1 — Title

BlobCast
Own your posts forever.

---

# Slide 2 — Problem

Current social media:

* centralized
* censorship-prone
* temporary
* platform-owned

Users do not truly own their content.

---

# Slide 3 — Solution

BlobCast:

* permanent decentralized posts
* wallet-owned identity
* Walrus-powered media persistence
* Sui ownership verification

---

# Slide 4 — Architecture

Show:

* frontend
* backend
* Walrus
* Tatum RPC
* Sui blockchain

---

# Slide 5 — Walrus Integration

Explain:

* decentralized blobs
* permanent media
* immutable posts
* decentralized archives

THIS SLIDE IS CRITICAL.

---

# Slide 6 — Tatum Integration

Explain:

* enterprise-grade RPC
* reliable indexing
* low latency transactions
* scalable blockchain communication

---

# Slide 7 — Demo Flow

1. Connect wallet
2. Create post
3. Upload media
4. Store on Walrus
5. Verify on-chain
6. View decentralized feed

---

# Slide 8 — AI Features

* AI summaries
* semantic search
* moderation
* trending engine

---

# Slide 9 — Why This Matters

BlobCast transforms:

* social ownership
* creator permanence
* decentralized identity

---

# Slide 10 — Closing

BlobCast
Own your posts forever.

---

# 8. Strategy to Win Both Bonus Awards

---

# To Win “Best Walrus Integration”

DO:

* Store ALL media on Walrus
* Store profile metadata on Walrus
* Store post blobs on Walrus
* Demonstrate backend shutdown while content still accessible
* Show immutable history

DON'T:

* Use Walrus only for images

JUDGES WILL NOTICE THIS.

---

# To Win “Best Use of Tatum Tools”

DO:

* Use Tatum RPC everywhere
* Mention reliability and scalability
* Use mainnet if possible
* Showcase transaction speed
* Explain why enterprise RPC matters

BONUS:
Use multiple endpoints:

* mainnet
* testnet
* fallback RPC strategy

---

# Most Important Demo Moment

THIS is your killer demo:

```txt
1. Create post
2. Upload image
3. Save to Walrus
4. Verify on Sui
5. Kill backend server
6. Reload feed
7. Content still exists
```

This demonstrates:

* true decentralization
* real Walrus usage
* meaningful architecture

This is what wins hackathons.
