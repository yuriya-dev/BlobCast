# 🔌 BlobCast — Backend Gateway API Documentation

This document describes the Express.js REST API service powering the BlobCast decentralized social network. By default, the server runs on port **`8080`** and exposes endpoints for **Sui wallet authentication**, **metadata indexing**, **direct messaging**, **sponsor transactions**, and the **Walrus local storage simulator**.

---

## 1. Authentication Mechanics & JWT Sessions

BlobCast implements **Sovereign Cryptographic Sign-in** (passwordless authentication).
1. The client requests a unique challenge nonce.
2. The user signs this challenge using their Sui wallet private key in the browser.
3. The client submits the signature and public key to `POST /api/auth/login`.
4. The server validates the cryptographic signature. If correct, it generates a stateful session secured by a **JSON Web Token (JWT)**, which is passed back to the client and included in the `Authorization: Bearer <token>` header of subsequent authenticated requests.

---

## 2. API Endpoint Directory

### A. Authentication Endpoints
- **`POST /api/auth/login`**
  - *Description*: Authenticate user via cryptographic wallet signature.
  - *Payload*:
    ```json
    {
      "walletAddress": "0x91ab3fdfcf98ae...",
      "signature": "AP123xyz...",
      "message": "Sign this challenge: 1748500000"
    }
    ```
  - *Response*:
    ```json
    {
      "success": true,
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "a1b2c3d4-...",
        "walletAddress": "0x91ab3fdfcf98ae...",
        "username": "vitalik"
      }
    }
    ```

---

### B. Social Posts Endpoints
- **`GET /api/posts`**
  - *Description*: Retrieve the paginated feed timeline (global or following).
  - *Query Parameters*: `page` (default: 1), `limit` (default: 10), `type` (timeline/trending).
  - *Response*:
    ```json
    {
      "posts": [
        {
          "id": "e5f6g7h8-...",
          "walrusBlobId": "walrus://post_12345",
          "blobHash": "sha256-abcdef123",
          "likeCount": 24,
          "commentCount": 5,
          "createdAt": "2026-06-01T07:00:00Z",
          "author": {
            "walletAddress": "0x91ab3f...",
            "displayName": "Vitalik"
          }
        }
      ]
    }
    ```

- **`POST /api/posts`** *(Auth Required)*
  - *Description*: Register metadata for a new post uploaded to Walrus.
  - *Payload*:
    ```json
    {
      "walrusBlobId": "walrus://post_98765",
      "blobHash": "sha256-qwerty543",
      "contentType": 0,
      "visibility": 0
    }
    ```
  - *Response*:
    ```json
    {
      "success": true,
      "post": {
        "id": "z9y8x7w6-...",
        "walrusBlobId": "walrus://post_98765",
        "createdAt": "2026-06-01T07:10:00Z"
      }
    }
    ```

- **`POST /api/posts/:id/like`** *(Auth Required)*
  - *Description*: Toggle a user like receipt off-chain.
  - *Response*: `{ "success": true, "liked": true }`

- **`POST /api/posts/:id/comments`** *(Auth Required)*
  - *Description*: Comment on a post. The comment body is stored in Walrus.
  - *Payload*: `{ "walrusBlobId": "walrus://comment_123" }`
  - *Response*: `{ "success": true, "commentId": "c7b8..." }`

- **`GET /api/posts/notifications`**
  - *Description*: Fetches the single latest active telemetry notification log from Redis (`notifications:latest`) for real-time console dashboards.
  - *Response*:
    ```json
    {
      "id": "sim_notif_1748500000",
      "type": "tip",
      "text": "Mysten Labs tipped you verifiably 10 SUI on your permanent social cast.",
      "time": "just now"
    }
    ```

---

### C. User Profiles Endpoints
- **`GET /api/users`**
  - *Description*: Fetch all registered users.
- **`GET /api/users/:walletAddress`**
  - *Description*: Get user profile details by SUI address.
- **`POST /api/users`** *(Auth Required)*
  - *Description*: Upsert a user profile identity.
  - *Payload*:
    ```json
    {
      "username": "yuriya",
      "displayName": "Yuriya Dev",
      "avatarBlobId": "walrus://avatar_yuriya",
      "bannerBlobId": "walrus://banner_yuriya",
      "bio": "Web3 Solutions Architect"
    }
    ```
  - *Response*: `{ "success": true, "user": { "username": "yuriya" } }`

- **`GET /api/users/notifications`** *(Auth Required)*
  - *Description*: Fetch the authenticated user's notifications.
- **`POST /api/users/notifications/read`** *(Auth Required)*
  - *Description*: Mark all unread notifications as read.

---

### D. Direct Messaging Endpoints
- **`GET /api/dm/conversations`** *(Auth Required)*
  - *Description*: Get all active chat sessions for the logged-in user.
- **`POST /api/dm/conversations`** *(Auth Required)*
  - *Description*: Instantiate or fetch a conversation with another participant.
  - *Payload*: `{ "recipientAddress": "0xabcdef..." }`
- **`GET /api/dm/conversations/:conversationId/messages`** *(Auth Required)*
  - *Description*: Retrieve encrypted message history within a specific conversation.
- **`POST /api/dm/conversations/:conversationId/messages`** *(Auth Required)*
  - *Description*: Send an encrypted message.
  - *Payload*:
    ```json
    {
      "text": "EncryptedBase64Payload==",
      "walrusBlobId": null
    }
    ```

---

### E. Economic Tip Endpoints
- **`POST /api/tips`**
  - *Description*: Register an on-chain SUI tip transaction.
  - *Payload*:
    ```json
    {
      "senderAddress": "0x1234...",
      "senderName": "Sui Fan",
      "recipientId": "user-uuid-...",
      "postId": "post-uuid-...",
      "amount": 5.5,
      "suiTxDigest": "DigestBlock123xyz",
      "blobHash": "tip-sha256"
    }
    ```
  - *Response*: `{ "success": true, "tipId": "tip-uuid-..." }`

---

### F. Gasless Sponsor Endpoints
- **`GET /api/sponsor/address`**
  - *Description*: Get the active system sponsor address and its current SUI balance.
- **`POST /api/sponsor`** *(Auth Required)*
  - *Description*: Construct and sign a sponsored transaction block for the client.
  - *Payload*: `{ "txBytes": "Base64TransactionBlockBytes" }`
  - *Response*: `{ "success": true, "signature": "SponsorSignatureHex" }`

---

### G. Walrus Storage Proxy & Caching Endpoints
Used to bypass browser connection pool limits and cache decentralized blobs for high performance.
- **`POST /api/walrus/blobs`**
  - *Description*: Synchronizes or simulated-uploads raw JSON or base64 contents directly to the PostgreSQL index.
  - *Payload*: `{ "blobId": "sim_blob_abc...", "content": "Raw post text content or base64 string" }`
  - *Response*: `{ "status": "success", "data": { "blob": { "id": "sim_blob_abc..." } } }`

- **`GET /api/walrus/blobs/:blobId`**
  - *Description*: Fetches JSON/text blob content. If the blob is not cached locally, it proxies to the real Walrus testnet aggregator with a 1.8-second timeout, caches it in PostgreSQL, and serves it.
- **`GET /api/walrus/blobs/:blobId/image`**
  - *Description*: Decodes and serves base64 image strings as raw binaries with full cache-control headers, proxying from the real aggregator if necessary.

---

### H. Token Analytics & Market Charts Endpoints
Provides real-time price feeds and historical OHLCV sparklines.
- **`GET /api/tokens/:ticker/chart`**
  - *Description*: Resolves the top liquidity pool address for any ticker (SUI, CETUS, BTC, ETH, PEPE, etc.) across all supported networks via GeckoTerminal, computes closing prices for the timeframe, and caches the payload in Redis for 5 minutes.
  - *Query Parameters*: `timeframe` (default: `1D`, supports `1D`, `1W`, `1M`, `1Y`, `ALL`).
  - *Response*:
    ```json
    {
      "status": "success",
      "tokenNotFound": false,
      "data": {
        "name": "cbBTC",
        "symbol": "BTC",
        "meta": "ETH • Crypto • Cross-Chain",
        "marketCap": "$3.1B FDV",
        "currentPrice": 72942.78,
        "changePct": -1.59,
        "isPositive": false,
        "avatarBg": "from-amber-500 to-walrus-blue",
        "avatarText": "BTC",
        "timeframeValues": [74119.9, ..., 72942.78]
      }
    }
    ```

