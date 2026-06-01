# 🌊 BlobCast — Sui & Walrus Mainnet Migration Guide

This document is a comprehensive, step-by-step technical guide for transitioning the **BlobCast** decentralized social publishing protocol from the Sui/Walrus Testnet environment to a production-ready **Sui & Walrus Mainnet** deployment.

As a Senior Web3 Solutions Architect, this checklist details smart contract deployment, Walrus permanent storage epoch funding, high-performance database pooling, and Next.js client adjustments.

---

## 📋 Migration Architecture Overview

```mermaid
graph TD
    subgraph Testnet["1. Sandbox Testnet (Current)"]
        TestContract["Move Testnet Package"]
        TestWalrus["Walrus Testnet Publisher/Aggreg"]
        TestTatum["Tatum Sui Testnet RPC"]
        TestDB["Dev pg-pool (No limits)"]
    end

    subgraph Mainnet["2. Production Mainnet (Target)"]
        MainContract["Move Mainnet Package"]
        MainWalrus["Walrus Mainnet Publisher/Aggreg"]
        MainTatum["Tatum Sui Mainnet RPC"]
        MainDB["Prod pg-pool (?connection_limit=25)"]
    end

    Testnet -->|1. Switch Environment| CLI["Sui CLI / Walrus CLI"]
    CLI -->|2. Source Mainnet SUI & WAL| Mainnet
    CLI -->|3. Compile & Deploy Contracts| Mainnet
    CLI -->|4. Configure Prod Server Env| Mainnet
    CLI -->|5. Build & Host Next.js App| Mainnet
```

---

## 🛠️ Step 1: Move Smart Contracts Mainnet Deployment

To deploy the BlobCast core Move contracts (`blobcast::post`, `blobcast_dm`, and tips registries) onto the Sui Mainnet, follow these steps:

### 1. Switch Sui CLI Environment to Mainnet
Verify your active CLI environment and switch to Mainnet:
```bash
# Verify environments
sui client envs

# Add Mainnet environment if not present
sui client new-env --rpc https://fullnode.mainnet.sui.io --alias mainnet

# Switch active environment to Mainnet
sui client switch --env mainnet
```

### 2. Fund your Mainnet Deployer Account
Ensure your active gas address has sufficient SUI to cover contract serialization and publish gas fees (~2–5 SUI):
```bash
sui client active-address
# Send Mainnet SUI to the displayed address
```

### 3. Compile and Publish
Navigate to your smart contract directory, compile the Move bytecode, and publish to Mainnet:
```bash
# Navigate to Move contract package
cd move/blobcast

# Build bytecode and run unit test checks
sui move build
sui move test

# Publish to SUI Mainnet
sui client publish --gas-budget 50000000
```
> [!IMPORTANT]
> Save the returned JSON command output. Locate the `publish` transaction effects and extract:
> - **Package ID**: The unique on-chain ID of your deployed bytecode.
> - **Publisher Cap ID**: Deployed object cap for upgrading.
> - **PostRegistry / DMRegistry Object IDs**: Deployed objects created in the contract's `init` function.

---

## 📦 Step 2: Walrus Mainnet Storage Integration & Operator Publisher Setup

Walrus Permanent Blob Storage charges for storage space based on storage size and the number of **Epochs** requested. On Mainnet, this is paid using **WAL tokens** on the SUI blockchain. Because Mainnet does not host an open public publisher endpoint without payment authorizations, you must run and operate an authorized local publisher daemon.

### 1. Source Mainnet WAL & SUI Tokens
1. Purchase native **WAL tokens** on Sui DEXs (e.g., Cetus, Aftermath) or bridge them onto the SUI chain.
2. Ensure your active CLI wallet address has a healthy balance of **SUI** (for gas fees) and **WAL** (for storage costs). A minimum starting balance of **5 SUI** and **20 WAL** is highly recommended to establish sub-wallet reserves.

### 2. Run the Authorized Local Walrus Publisher Daemon
Start the native `walrus publisher` CLI daemon to manage concurrent transactions and storage object creations. The daemon automatically generates and maintains internal "sub-wallets" in a private directory to handle multiplexed uploads without transaction conflicts:

```bash
# 1. Create a secure directory within the backend server for sub-wallets
mkdir -p server/walrus-sub-wallets

# 2. Start the publisher service pointing to your local config and active mainnet context
walrus publisher \
  --sub-wallets-dir server/walrus-sub-wallets \
  --bind-address 127.0.0.1:31415
```

> [!IMPORTANT]
> The publisher daemon automatically spins up **8 concurrent client sub-wallets** (sui_0 to sui_7), registers them, and funds their MIST (gas) and FROST (WAL) balances directly from your active SUI CLI wallet.
> Keep this service running in the background as a process manager daemon (e.g., via PM2 or a systemd service).

### 3. Expose Keys and Wallet Export Utility
To import any of the auto-generated operator sub-wallets into browser extensions (such as **Sui Wallet**, **Surf Wallet**, or **OKX**) for manual balance tracking and transfers:
1. Access the `server/walrus-sub-wallets/` directory (which is safely ignored by `.gitignore` to prevent key exposure).
2. Run the dynamic export utility script:
   ```bash
   node server/tools/export-keys.js
   ```
3. The script decodes the raw base64 keystores and outputs:
   * **Sui Address**: Public destination address.
   * **Hex Key (`0x...`)**: For OKX / Surf imports.
   * **Bech32 Key (`suiprivkey...`)**: Direct drop-in for standard browser extensions.

### 4. Adjust Congestion Connection Timeouts
Writing 1,000 shards verifiably across a grid of 120 distributed storage nodes requires substantial validation. Standard network operations can take **15–20 seconds** during times of network load.
To prevent premature transaction failure, verify that all backend and frontend timeouts are increased to **60 seconds**:
* **Backend (`server/src/controllers/walrusSimController.ts`)**:
  ```typescript
  signal: AbortSignal.timeout(60000)
  ```
* **Frontend (`client/src/lib/walrus.ts`)**:
  ```typescript
  signal: AbortSignal.timeout(60000)
  ```

### 5. Configure Gateway Connections
Update the environment variables to route all client and server requests through your active operator publisher daemon:
* **Aggregator URL**: `https://aggregator.walrus-mainnet.walrus.space` (Public read-only grid).
* **Publisher URL**: `http://127.0.0.1:31415` (Your running operator gateway).

---

## 🖥️ Step 3: Backend Express API Configuration

Update the backend server configurations inside `server/.env` to point to SUI Mainnet and enable high-performance pooling.

### 1. Production Environment Variables (`server/.env`)
Create or edit `server/.env` with production-grade configurations:

```env
# ─── Server Configuration ─────────────────────────────────────────────────────
PORT=8080
NODE_ENV=production
JWT_SECRET=super_strong_custom_production_jwt_secret_key_123xyz_!

# ─── High-Performance PostgreSQL Connection ────────────────────────────────────
# Set a healthy connection limit (?connection_limit=25) to prevent transaction mode pool locks
DATABASE_URL="postgresql://db_user:db_password@prod-db-host:5432/blobcast?schema=public&connection_limit=25"

# ─── Upstash Redis Caching (For dynamic trending telemetry) ────────────────────
REDIS_URL="redis://default:redis_password@prod-redis-host:6379"

# ─── Sui Mainnet RPC Gateways ─────────────────────────────────────────────────
# Tatum Mainnet RPC endpoint configuration (or standard Sui RPC node)
SUI_RPC_URL="https://tatum-sui-mainnet-rpc-endpoint-here"
SUI_BACKUP_RPC_URL="https://fullnode.mainnet.sui.io:443"

# ─── Walrus Storage Mainnet Gateways ─────────────────────────────────────────
WALRUS_PUBLISHER_URL="http://127.0.0.1:31415"
WALRUS_AGGREGATOR_URL="https://aggregator.walrus-mainnet.walrus.space"

# ─── Move Smart Contract IDs (Mainnet) ───────────────────────────────────────
SUI_PACKAGE_ID="0x_YOUR_MAINNET_MOVE_PACKAGE_ID_HERE"
SUI_POST_REGISTRY_ID="0x_YOUR_MAINNET_POST_REGISTRY_OBJECT_ID"
SUI_DM_REGISTRY_ID="0x_YOUR_MAINNET_DM_REGISTRY_OBJECT_ID"
```

### 2. Set Up Process Managers (PM2)
To keep the Indexer Daemon and Express API Gateway running continuously in the background on Mainnet servers, run them using **PM2**:
```bash
# Install PM2 globally
npm install -g pm2

# Start the Express API Server in Cluster Mode (scales to all CPU cores)
pm2 start dist/server.js --name "blobcast-api" -i max

# Start the Sui Indexer Daemon (monitors checkpoint events verifiably)
pm2 start dist/indexer.js --name "blobcast-indexer"

# Monitor active logs
pm2 logs
```

---

## 🌐 Step 4: Next.js Client Configuration

Configure the React/Next.js client to query Sui Mainnet wallet connections and talk to our Mainnet Express proxy API.

### 1. Client Production Configurations (`client/.env`)
Configure the client-side `.env` file for Vercel/production deployment:

```env
# ─── API Gateway Connection ───────────────────────────────────────────────────
NEXT_PUBLIC_API_URL="https://api.blobcast.social/api"

# ─── Client-Side Walrus Proxy Endpoints ────────────────────────────────────────
# Note: The client routes all aggregator queries through our Express proxy 
# to bypass connection pool freezes.
NEXT_PUBLIC_WALRUS_AGGREGATOR_URL="https://aggregator.walrus-mainnet.walrus.space"
NEXT_PUBLIC_WALRUS_PUBLISHER_URL="http://127.0.0.1:31415"
```

### 2. Configure Mysten DappKit to Sui Mainnet
In `client/src/components/providers/SuiProvider.tsx` (or your dApp wallet config file), ensure the active wallet network is configured strictly to **`mainnet`**:
```typescript
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';

// Config client network to SUI Mainnet
const { networkConfig } = createNetworkConfig({
	mainnet: { url: getFullnodeUrl('mainnet') },
});

export function SuiProvider({ children }: { children: React.ReactNode }) {
	return (
		<SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
			<WalletProvider autoConnect>
				{children}
			</WalletProvider>
		</SuiClientProvider>
	);
}
```

### 3. Build the Next.js Production Bundle
Transpile, optimize, and bundle the client-side code:
```bash
cd client
# Run production build checks
npm run build

# Start production server locally (for testing)
npm run start
```
> [!TIP]
> The production build compiles Next.js pages into statically optimized HTML/React assets. JIT (Just-In-Time) transpilation latency is completely eliminated, resulting in **under 50ms** first-paint speeds!

---

## 🔒 Step 5: Post-Migration Production Checklist

- [ ] **Sui Gas Sponsorship**: Verify that the backend Sponsor Gas Wallet is funded with a minimum of **50 SUI** on Mainnet to avoid sponsoring fails.
- [ ] **Redis Caching Uptime**: Verify that the Upstash Redis instance is active to cache GeckoTerminal price candlestick OHLCV structures.
- [ ] **Content Moderation Protection**: Ensure that moderation flags (`visiblePostWhere` in prisma queries) are active on the production index database to protect users against spam casts.
- [ ] **Autoshard Fast-Forward Verify**: On the first start, verify that the indexer successfully catches the Mainnet Sui block sequence tip without memory exhaustion.
