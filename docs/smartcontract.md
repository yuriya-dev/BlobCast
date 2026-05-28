# BlobCast — Sui Smart Contract Architecture

> Smart contract design for BlobCast decentralized social protocol on Sui.

---

# 1. Smart Contract Philosophy

BlobCast uses Sui smart contracts only for:

* ownership verification
* immutable references
* identity
* social interactions
* economic actions

Heavy content such as:

* text blobs
* images
* videos
* AI metadata

are stored in Walrus.

This architecture minimizes:

* gas fees
* storage costs
* blockchain bloat

while preserving:

* authenticity
* authorship
* permanence

---

# 2. Core Design Principles

## Lightweight On-chain Data

Only essential metadata is stored on-chain.

## Permanent Off-chain Blobs

Content lives in Walrus.

## User-Owned Identity

Wallet = account identity.

## Verifiable Content

Every post references:

* blob hash
* blob ID
* owner

---

# 3. Smart Contract Modules

```txt id="sui_modules"
blobcast/
├── profile.move
├── post.move
├── interaction.move
├── tipping.move
├── moderation.move
├── events.move
├── utils.move
└── blobcast.move
```

---

# 4. Global Architecture

```txt id="global_arch"
User Wallet
    │
    ▼
Sui Smart Contract
    │
    ├── Ownership
    ├── Blob References
    ├── Likes/Reposts
    ├── Tipping
    └── Events
    │
    ▼
Walrus Storage
    ├── Posts
    ├── Images
    ├── Videos
    └── Profile Metadata
```

---

# 5. Object Model

Sui uses object-based architecture.

BlobCast leverages:

* owned objects
* shared objects
* event-driven indexing

---

# 6. Profile Module

File:

```txt id="profile_file"
profile.move
```

Purpose:

* decentralized user identity
* usernames
* avatars
* profile metadata

---

## Profile Object

```move id="profile_struct"
public struct Profile has key, store {
    id: UID,
    owner: address,
    username: String,
    walrus_avatar_blob: String,
    walrus_banner_blob: String,
    bio_blob: String,
    created_at: u64,
    verified: bool
}
```

---

## Functions

### Create Profile

```move id="create_profile"
public entry fun create_profile(
    username: String,
    avatar_blob: String,
    bio_blob: String,
    ctx: &mut TxContext
)
```

---

### Update Profile

```move id="update_profile"
public entry fun update_profile(
    profile: &mut Profile,
    avatar_blob: String,
    bio_blob: String
)
```

---

# 7. Post Module

File:

```txt id="post_file"
post.move
```

Purpose:

* post ownership
* Walrus references
* timestamps
* visibility

---

## Post Object

```move id="post_struct"
public struct Post has key, store {
    id: UID,
    author: address,
    walrus_blob_id: String,
    blob_hash: vector<u8>,
    content_type: u8,
    visibility: u8,
    reply_to: Option<ID>,
    repost_of: Option<ID>,
    like_count: u64,
    comment_count: u64,
    repost_count: u64,
    created_at: u64
}
```

---

## Content Type Enum

```txt id="content_type"
0 = text
1 = image
2 = video
3 = thread
4 = poll
```

---

## Visibility Enum

```txt id="visibility"
0 = public
1 = followers_only
2 = private
```

---

## Create Post

```move id="create_post"
public entry fun create_post(
    walrus_blob_id: String,
    blob_hash: vector<u8>,
    content_type: u8,
    visibility: u8,
    reply_to: Option<ID>,
    repost_of: Option<ID>,
    ctx: &mut TxContext
)
```

---

# 8. Interaction Module

File:

```txt id="interaction_file"
interaction.move
```

Purpose:

* likes
* reposts
* bookmarks
* follows

---

## Like Object

```move id="like_struct"
public struct Like has key {
    id: UID,
    user: address,
    post_id: ID,
    created_at: u64
}
```

---

## Follow Object

```move id="follow_struct"
public struct Follow has key {
    id: UID,
    follower: address,
    following: address,
    created_at: u64
}
```

---

## Functions

### Like Post

```move id="like_post"
public entry fun like_post(
    post: &mut Post,
    ctx: &mut TxContext
)
```

---

### Follow User

```move id="follow_user"
public entry fun follow_user(
    target: address,
    ctx: &mut TxContext
)
```

---

# 9. Tipping Module

File:

```txt id="tipping_file"
tipping.move
```

Purpose:

* creator monetization
* micro-transactions
* support economy

---

## Tip Event

```move id="tip_event"
public struct TipEvent has copy, drop {
    sender: address,
    receiver: address,
    amount: u64,
    post_id: ID
}
```

---

## Tip Function

```move id="tip_function"
public entry fun tip_creator(
    recipient: address,
    post_id: ID,
    coin: Coin<SUI>,
    ctx: &mut TxContext
)
```

---

# 10. Moderation Module

File:

```txt id="moderation_file"
moderation.move
```

Purpose:

* decentralized moderation flags
* spam detection metadata
* report tracking

IMPORTANT:
Content is NOT deleted.

Instead:

* UI hides flagged content
* blobs remain immutable

---

## Report Object

```move id="report_struct"
public struct Report has key {
    id: UID,
    reporter: address,
    post_id: ID,
    reason_code: u8,
    created_at: u64
}
```

---

# 11. Event Architecture

BlobCast heavily uses Sui events.

Events power:

* indexing
* feed updates
* notifications
* analytics

---

## PostCreated Event

```move id="post_created_event"
public struct PostCreated has copy, drop {
    post_id: ID,
    author: address,
    walrus_blob_id: String,
    timestamp: u64
}
```

---

## LikeCreated Event

```move id="like_event"
public struct LikeCreated has copy, drop {
    post_id: ID,
    user: address,
    timestamp: u64
}
```

---

# 12. Indexing Architecture

## Why Indexers Are Needed

Blockchain querying is expensive.

BlobCast uses off-chain indexers:

* PostgreSQL
* Redis
* Search engine

to create:

* fast feeds
* trending pages
* profile lookups

---

## Indexing Flow

```txt id="index_flow"
Sui Events
    │
    ▼
Indexer Worker
    │
    ├── PostgreSQL
    ├── Redis
    └── Search Engine
```

---

# 13. Walrus Integration Design

Smart contracts never store full content.

Only:

* blob IDs
* hashes
* metadata references

---

## Walrus Blob Example

```json id="walrus_blob"
{
  "author": "0x91ab...",
  "content": "Own your posts forever",
  "media": [
    {
      "type": "image",
      "blob": "walrus://8x7as..."
    }
  ],
  "timestamp": 1748500000
}
```

---

# 14. Security Design

## Anti-Spam

* rate limits
* minimum wallet age
* optional posting fee

## Signature Validation

All actions signed by wallet owner.

## Replay Protection

Transaction nonce validation.

## Immutable Ownership

Post authorship permanently verifiable.

---

# 15. Gas Optimization Strategy

## Avoid Large On-chain Strings

Store blobs externally.

## Event-Based Updates

Use events instead of heavy object mutations.

## Compact Metadata

Minimal storage footprint.

---

# 16. Upgradeability Strategy

BlobCast uses:

* modular Move packages
* isolated modules
* event-driven architecture

allowing:

* incremental upgrades
* future social features
* DAO governance later

---

# 17. Recommended Package Layout

```txt id="package_layout"
sources/
├── blobcast.move
├── profile.move
├── post.move
├── interaction.move
├── tipping.move
├── moderation.move
└── events.move

tests/
├── profile_tests.move
├── post_tests.move
└── tipping_tests.move
```

---

# 18. Future Smart Contract Features

## Planned Features

* DAO moderation
* NFT profile badges
* token-gated communities
* decentralized reputation
* creator subscriptions
* encrypted private posts
* zk identity verification

---

# 19. Why This Design Fits the Hackathon

This architecture demonstrates:

* meaningful Walrus integration
* real Sui usage
* scalable decentralized design
* production-ready thinking

It avoids:

* fake decentralization
* unnecessary blockchain storage
* expensive architecture mistakes

while maximizing:

* usability
* scalability
* permanence
* mainnet readiness

---

# 20. Final Summary

BlobCast smart contracts are intentionally lightweight.

Blockchain handles:

* trust
* ownership
* verification
* social actions

Walrus handles:

* permanent content storage

Off-chain infrastructure handles:

* speed
* indexing
* UX

This creates a practical decentralized social protocol suitable for real-world deployment on Sui mainnet.
