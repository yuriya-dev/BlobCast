# 📜 BlobCast — Sui Move Smart Contracts Documentation

This document provides a highly technical overview of the **Sui Move smart contracts** powering the on-chain operations of the BlobCast decentralized social protocol. The smart contracts are located in the `/move` directory and manage **ownership**, **economic transactions**, **encrypted communication permissions**, and **telemetry indexing events**.

---

## 1. Move Package Structural Overview

The BlobCast Move package is built with modularity and gas efficiency in mind. By keeping modules focused on specific social primitives, we achieve low execution costs and clean architectural boundaries.

```
move/
├── Move.toml                 # Package definition & dependency layers
└── sources/
    ├── events.move           # Centralized indexing telemetry events
    ├── profile.move          # Sovereign digital identity profiles
    ├── post.move             # On-chain post ownership & blob references
    ├── interaction.move      # Social primitives (Likes & Follows)
    ├── tipping.move          # Verified peer-to-peer SUI tip transfers
    └── blobcast_dm.move      # Access policies for encrypted messaging
```

---

## 2. Module Breakdown & API Reference

### A. Profile Module (`profile.move`)
Handles the creation and updating of sovereign user profiles on the Sui network. Profiles are registered as **Owned Objects** transferred directly to the creator's wallet address.

#### Data Structures
```move
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

#### Core Entry Functions
- **`create_profile`**:
  ```move
  public entry fun create_profile(
      username: String,
      walrus_avatar_blob: String,
      walrus_banner_blob: String,
      bio_blob: String,
      clock: &sui::clock::Clock,
      ctx: &mut TxContext
  )
  ```
  *Description*: Registers a brand new user profile on-chain. Allocates a unique object ID, sets metadata references to permanent Walrus storage, and transfers the `Profile` object directly to the transaction sender (`transfer::transfer`). Emits `events::ProfileCreated` for indexing.

- **`update_profile`**:
  ```move
  public entry fun update_profile(
      profile: &mut Profile,
      walrus_avatar_blob: String,
      walrus_banner_blob: String,
      bio_blob: String,
      ctx: &mut TxContext
  )
  ```
  *Description*: Updates profile metadata fields. Enforces strict signature validation:
  ```move
  assert!(profile.owner == tx_context::sender(ctx), 0);
  ```

- **`verify_profile`**:
  ```move
  public entry fun verify_profile(
      profile: &mut Profile,
      status: bool,
      _ctx: &mut TxContext
  )
  ```
  *Description*: Grants or revokes a profile's verified verification checkmark status (governance/moderator action).

---

### B. Post Module (`post.move`)
Registers social casts on the blockchain. Because other users must be able to read, like, and tip these posts on-chain, `Post` objects are published as **Shared Objects** (`transfer::share_object`).

#### Data Structures
```move
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

#### Core Entry Functions
- **`create_post`**:
  ```move
  public entry fun create_post(
      walrus_blob_id: String,
      blob_hash: vector<u8>,
      content_type: u8,
      visibility: u8,
      reply_to_opt: Option<ID>,
      repost_of_opt: Option<ID>,
      clock: &sui::clock::Clock,
      ctx: &mut TxContext
  )
  ```
  *Description*: Publishes a post on-chain, linking it to the permanent Walrus blob reference (`walrus_blob_id`) containing the post JSON payload. Emits `events::PostCreated` for indexer ingestion.

---

### C. Interaction Module (`interaction.move`)
Manages standard social graph primitives. Likes and follows generate verifiable receipts/objects owned by the user who initiated the action.

#### Data Structures
```move
public struct Like has key {
    id: UID,
    user: address,
    post_id: ID,
    created_at: u64
}

public struct Follow has key {
    id: UID,
    follower: address,
    following: address,
    created_at: u64
}
```

#### Core Entry Functions
- **`like_post`**:
  ```move
  public entry fun like_post(
      post: &mut Post,
      clock: &sui::clock::Clock,
      ctx: &mut TxContext
  )
  ```
  *Description*: Verifiably registers a post like. Accesses the shared `Post` object to increment its on-chain like counter, creates an owned `Like` receipt object, and transfers it to the liking user's wallet. Emits `events::LikeCreated`.

- **`follow_user`**:
  ```move
  public entry fun follow_user(
      target_creator: address,
      clock: &sui::clock::Clock,
      ctx: &mut TxContext
  )
  ```
  *Description*: Establishes a verified social connection. Instantiates a `Follow` object indicating the follower and target following address, transferring the receipt to the follower's wallet.

---

### D. Tipping Module (`tipping.move`)
Enables direct economic interaction on-chain. Readers can tip content creators in native **SUI** coins, with all transaction records emitted in indexing events.

#### Core Entry Functions
- **`tip_creator`**:
  ```move
  public entry fun tip_creator(
      recipient: address,
      post_id: ID,
      tip_coin: &mut Coin<SUI>,
      amount: u64,
      clock: &sui::clock::Clock,
      ctx: &mut TxContext
  )
  ```
  *Description*: Splits the designated tip amount from the user's `sui::coin::Coin<SUI>` object (`coin::split`) and verifiably transfers it directly to the creator's address (`transfer::public_transfer`). Emits `events::TipEvent` containing the sender, receiver, post ID, and timestamp.

---

### E. Direct Message Module (`blobcast_dm.move`)
Maintains conversation access policies on-chain. Conversation objects are shared, enabling key servers to verify participants prior to granting decryption keys.

#### Data Structures
```move
public struct Conversation has key, store {
    id: UID,
    participant1: address,
    participant2: address,
}
```

#### Core Entry Functions
- **`create_conversation`**:
  ```move
  public entry fun create_conversation(
      participant2: address, 
      ctx: &mut TxContext
  )
  ```
  *Description*: Establishes a shared conversation session between the caller and a recipient (`participant2`), publishing the object as shared.

- **`seal_approve`**:
  ```move
  public entry fun seal_approve(
      _key_id: vector<u8>,
      conversation: &Conversation,
      ctx: &mut TxContext
  )
  ```
  *Description*: Validates that the transaction sender is one of the two authorized conversation participants. This function is gated and recognized by key servers to verifiably approve E2E decryption.
  ```move
  assert!(
      sender == conversation.participant1 || sender == conversation.participant2,
      ENoAccess
  );
  ```

---

### F. Telemetry Events Module (`events.move`)
A dedicated module for structured Move event telemetry. By using compact event emissions rather than storing large arrays on-chain, BlobCast minimizes gas costs and leverages highly responsive indexing streams.

#### Emitted Structs
- `PostCreated`: Tracks new casts (`post_id`, `author`, `walrus_blob_id`, `content_type`, `created_at`).
- `LikeCreated`: Tracks post likes (`post_id`, `user`, `created_at`).
- `TipEvent`: Tracks creator tipping (`sender`, `receiver`, `amount`, `post_id`, `created_at`).
- `ProfileCreated`: Tracks user identity creations (`profile_id`, `owner`, `username`, `created_at`).

---

## 3. Object-Based Architecture Rationale

Sui utilizes an **Object-Based Data Model** rather than a traditional account-balance model (like Ethereum). BlobCast leverages this architecture to optimize cost and performance:

1. **Shared Objects (Posts, DMs)**:
   Shared objects can be mutated or read by multiple callers. By sharing the `Post` and `Conversation` objects, any user can trigger actions such as incrementing like counters, issuing creator tips, or querying encrypted message permission rules.
   
2. **Owned Objects (Profiles, Likes, Follows)**:
   Owned objects belong exclusively to a single wallet address. Because a user's `Profile`, `Like` receipt, or `Follow` relationship object is stored directly in their own wallet, these transactions do not require global consensus sorting. This results in **sub-second transaction finality** and **minimal gas fees**, showing the power of the Sui blockchain architecture.
