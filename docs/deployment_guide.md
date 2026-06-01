# 🚀 BlobCast — Comprehensive Production Deployment Guide

This document is a professional, production-grade guide for building, provisioning, and deploying the **BlobCast** decentralized social publishing protocol onto mainnet infrastructure.

This guide covers:
1. Deploying Sui Move Smart Contracts onto **Sui Mainnet**.
2. Provisioning & Deploying the **Walrus Operator Publisher** service on **Fly.io** with persistent volume mounts.
3. Provisioning & Deploying the **Backend API & Indexer Daemon** on **Fly.io**.
4. Deploying the **Next.js Frontend Client** on **Vercel**.

---

## 📊 Deployment Architecture

```mermaid
graph TD
    subgraph ClientLayer["1. Client Layer (Vercel)"]
        NextJS["Next.js Web Client"]
    end

    subgraph APILayer["2. API & Indexer Layer (Fly.io)"]
        Express["Express API Gateway"]
        Indexer["Sui Checkpoint Event Indexer"]
    end

    subgraph StorageLayer["3. Walrus Publisher Layer (Fly.io)"]
        Publisher["Walrus Operator Publisher (Docker)"]
        Volume[("Persistent Volume (/wallets)")]
        Publisher --- Volume
    end

    subgraph DataCacheLayer["4. Database & Caching Tier"]
        DB[(Supabase Managed PostgreSQL)]
        Cache[(Upstash Managed Redis)]
    end

    subgraph Blockchain["5. Decentralized Web3 Networks"]
        Sui["Sui Blockchain (Mainnet)"]
        Walrus["Walrus Storage Grid (Mainnet)"]
    end

    NextJS -->|JSON REST / WS| Express
    NextJS -->|Aggregated Read| Walrus
    Express -->|Read/Write| DB
    Express -->|Telemetry Cache| Cache
    Express -->|Proxy Write| Publisher
    Indexer -->|Sync Checkpoints| Sui
    Publisher -->|Certify Blobs| Sui
    Publisher -->|Distribute Shards| Walrus
```

---

## 🛠️ 1. Pre-deployment Prerequisites

Ensure you have established accounts and installed the required CLI development tools:
- **Node.js 20+** installed locally.
- **Docker** installed locally for compiling container assets.
- **Sui CLI (v1.20+)** installed and active.
- **Fly.io CLI (`flyctl`)** installed and logged in (`fly auth login`).
- **Supabase Account** to provision a managed PostgreSQL database.
- **Upstash Account** to provision a managed Redis instance.
- **Vercel Account** for hosting the Next.js static and edge bundles.

---

## ⛓️ 2. Step 1: Deploy Sui Move Smart Contracts

Deploy the BlobCast core Move contracts (`blobcast::post`, `blobcast_dm`, and tip registries) to Sui Mainnet.

1. **Switch CLI to Mainnet**:
   ```bash
   # Add Mainnet environment if not present
   sui client new-env --rpc https://fullnode.mainnet.sui.io:443 --alias mainnet
   
   # Switch active environment
   sui client switch --env mainnet
   ```
2. **Fund Your Deployer Address**:
   Find your active gas address and fund it with ~3–5 SUI:
   ```bash
   sui client active-address
   ```
3. **Compile & Test Bytecode**:
   Navigate to the smart contract folder, compile the package, and run unit tests:
   ```bash
   cd move
   sui move build
   sui move test
   ```
4. **Publish Contracts**:
   Deploy the bytecode on-chain:
   ```bash
   sui client publish --gas-budget 150000000
   ```
5. **Record On-chain Object IDs**:
   Extract and record these essential object IDs from the command output:
   * **`Package ID`**: Deployed bytecode address.
   * **`PostRegistry ID`**: Shared object created in `init`.
   * **`DMRegistry ID`**: Shared direct message access registry.

---

## 📦 3. Step 2: Deploy Walrus Operator Publisher on Fly.io

Because Walrus Mainnet does not host public/free write endpoints, you must host your own authorized publisher daemon. To ensure sub-wallets do not get recreated and re-funded on every redeployment, the publisher must be deployed using a **Persistent Volume**.

### A. Initialize the Publisher Project
Create a new directory for the publisher configuration:
```bash
mkdir -p deploy/walrus-publisher
cd deploy/walrus-publisher
```

### B. Configure the Fly.io Application (`fly.toml`)
Create a `fly.toml` file to run the official Walrus Publisher Docker image:
```toml
app = "blobcast-walrus-publisher"
primary_region = "sin" # Choose the closest region to your server

[build]
  image = "ghcr.io/mystenlabs/walrus/publisher:latest"

[env]
  # Target Sui & Walrus Mainnet
  SUI_NETWORK = "mainnet"
  
  # Bind address inside the container
  BIND_ADDRESS = "0.0.0.0:31415"

[mounts]
  source = "walrus_wallets_vol"
  destination = "/wallets"

[[services]]
  http_checks = []
  internal_port = 31415
  processes = ["app"]
  protocol = "tcp"
  
  [services.concurrency]
    hard_limit = 25
    soft_limit = 20
    type = "connections"

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80
```

### C. Create and Provision Resources
1. **Create the Fly Application**:
   ```bash
   fly apps create blobcast-walrus-publisher
   ```
2. **Provision the Persistent Volume**:
   Create a 1GB persistent volume in your chosen region to save the sub-wallets keys permanently:
   ```bash
   fly volumes create walrus_wallets_vol --size 1 --region sin
   ```
3. **Mount and Inject the Main Wallet**:
   The publisher CLI requires your private key to automatically create and fund the sub-wallets. Add your Sui Active Address Key (Bech32 `suiprivkey...`) as a secret:
   ```bash
   fly secrets set SUI_PRIVATE_KEY="suiprivkey1qrzj..."
   ```

### D. Deploy the Publisher
Launch the publisher on Fly.io:
```bash
fly deploy --strategy rolling
```
Verify that the service is running, generating sub-wallets, and funding them on Mainnet. Record your live public app domain (e.g., `https://blobcast-walrus-publisher.fly.dev`).

---

## 🖥️ 4. Step 3: Deploy the Backend API Server on Fly.io

The backend Express API gateway processes routes, handles gas sponsorships, and coordinates the Sui Off-chain Indexer daemon.

### A. Configure Fly.io Launch (`server/fly.toml`)
Navigate to `server/` and initialize your Fly configuration:
```toml
app = "blobcast-api-server"
primary_region = "sin"

[build]
  # Express Docker build handles building ts assets
  dockerfile = "Dockerfile"

[env]
  PORT = "8080"
  NODE_ENV = "production"
  SUI_NETWORK = "mainnet"
  WALRUS_AGGREGATOR_URL = "https://aggregator.walrus-mainnet.walrus.space"
  WALRUS_PUBLISHER_URL = "https://blobcast-walrus-publisher.fly.dev"

[[services]]
  internal_port = 8080
  processes = ["app"]
  protocol = "tcp"

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

### B. Configure Secrets on Fly.io
Inject production credentials and keys securely using Fly Secrets:
```bash
fly secrets set \
  DATABASE_URL="postgresql://postgres:[password]@aws-1.pooler.supabase.com:6543/postgres?schema=public&pgbouncer=true&connection_limit=25" \
  REDIS_URL="redis://default:[password]@active-upstash-redis.upstash.io:6379" \
  SPONSOR_PRIVATE_KEY="suiprivkey1qrtr..." \
  WALRUS_PUBLISHER_JWT_SECRET="super_strong_custom_production_jwt_secret_key" \
  TATUM_API_KEY="your-tatum-api-key"
```

### C. Deploy the API & Indexer
Launch your containerized application:
```bash
fly deploy
```
Fly.io will automatically trigger the containerized compiler, run the database migrations (`npx prisma db push`), and bring the Express API online together with the off-chain checkpoint event indexer daemon. Save the live URL (e.g., `https://blobcast-api-server.fly.dev`).

---

## 🌐 5. Step 4: Deploy Next.js Client on Vercel

The React frontend handles client-side wallet connections, threshold encryption, and rendering posts.

1. **Import Project to Vercel**:
   Connect your Github repository on Vercel. Choose the root folder `/client`.
2. **Configure Client Environment Variables**:
   Inject these variables into your Vercel project configuration dashboard:
   
   | Environment Key | Description | Production Value |
   |:---|:---|:---|
   | `NEXT_PUBLIC_API_URL` | Your live backend API server | `https://blobcast-api-server.fly.dev/api` |
   | `NEXT_PUBLIC_SUI_NETWORK` | The targeted Sui network | `mainnet` |
   | `NEXT_PUBLIC_BLOBCAST_PACKAGE_ID` | Your deployed contract Package ID | `0x391fc852ab7eb69bc3a6c328067b55f25a6411fa859ccfd4679aedfb9e1a909c` |
   | `NEXT_PUBLIC_WALRUS_AGGREGATOR_URL` | Public Mainnet Walrus aggregator | `https://aggregator.walrus-mainnet.walrus.space` |
   | `NEXT_PUBLIC_WALRUS_PUBLISHER_URL` | Your active local/proxied Fly publisher | `https://blobcast-walrus-publisher.fly.dev` |

3. **Deploy & Build static assets**:
   Vercel compiles the React components into statically optimized, high-performance HTML/JS assets and distributes them globally via Vercel Edge Networks.

---

## 🔒 6. Post-deployment Production Checklist

To verify that the entire BlobCast network is successfully online and unified:
- [ ] **Sui Gas Sponsorship**: Verify that the backend Sponsor Gas Wallet is funded with a minimum of **50 SUI** on Mainnet to prevent user registration/tip sponsorship failures.
- [ ] **Storage Funding**: Verify that the Walrus Publisher's active sub-wallets hold sufficient SUI and WAL to pay storage fees. Use the `export-keys.js` script to monitor sub-wallet balances.
- [ ] **Connection Timeouts**: Ensure all network fetch calls are configured with a **60-second** timeout (`AbortSignal.timeout(60000)`) to cope with high transaction validation queues.
- [ ] **Content Moderation Protection**: Ensure that moderation flags (`visiblePostWhere` in prisma queries) are active on the production index database to protect users against spam casts.
- [ ] **Autoshard Fast-Forward Verify**: On the first start, verify that the indexer successfully catches the Mainnet Sui block sequence tip without memory exhaustion.
