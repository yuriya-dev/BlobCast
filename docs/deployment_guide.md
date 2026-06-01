# 🚀 BlobCast — End-to-End Deployment Guide

This document provides step-by-step instructions for building, provisioning, and deploying the **BlobCast** protocol. This guide covers smart contract publication on the Sui network, backend API service deployment on **Railway / Fly.io**, and frontend client deployment on **Vercel**.

---

## 1. Pre-deployment Prerequisites

Before initiating the deployment workflow, ensure you have set up accounts and installed the required development CLI tools:
- **Node.js 20+** installed locally.
- **Sui CLI** (version 1.20+) installed and configured with a funded testnet/mainnet active address.
- **Tatum Developer Account** with a valid API key for Sui RPC gateway nodes.
- **Supabase Account** to provision a managed PostgreSQL database.
- **Upstash Account** to provision a managed Redis instance.
- **Vercel Account** for hosting Next.js.
- **Railway or Fly.io Account** for hosting the backend Express server daemon.

---

## 2. Step 1: Deploy Sui Move Smart Contracts

1. **Configure Sui CLI Env**:
   Switch to testnet (or mainnet if ready):
   ```bash
   sui client active-env
   # If not on testnet:
   sui client switch --env testnet
   ```
2. **Verify Gas Funding**:
   Check your active address balance:
   ```bash
   sui client balance
   ```
3. **Compile contracts**:
   Navigate to the `/move` directory and build the move package to ensure zero compiler warnings:
   ```bash
   cd move
   sui move build
   ```
4. **Deploy Contract Suite**:
   Publish the Move package on-chain:
   ```bash
   sui client publish --gas-budget 200000000
   ```
5. **Note Deployment IDs**:
   Save the printed terminal values. You will need:
   - **`Package ID`** (the contract code address).
   - **`Post Shared Object ID`** (the shared post registry object).

---

## 3. Step 2: Provision & Deploy the Backend API Service

The Express server acts as the central API gateway and runs the off-chain indexer daemon in the background.

1. **Initialize Database Schema**:
   Set up your PostgreSQL database in Supabase. Acquire the transaction-mode Database connection string.
2. **Configure Environment Variables**:
   In your hosting dashboard (e.g. Railway), create a new service pulling from your GitHub repository (directory: `/server`). Configure these environment variables:
   
   ```properties
   # Server settings
   PORT=8080
   NODE_ENV=production
   JWT_SECRET=super_secret_jwt_signature_key

   # Relational database (Supabase PostgreSQL)
   DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres?schema=public&pgbouncer=true"

   # Redis Caching (Upstash)
   REDIS_URL="rediss://default:[password]@active-upstash-redis-uri.upstash.io:6379"

   # Tatum RPC Infrastructure
   TATUM_API_KEY="your_tatum_api_key"
   TATUM_SUI_TESTNET_RPC="https://sui-testnet.gateway.tatum.io"
   TATUM_SUI_MAINNET_RPC="https://sui-mainnet.gateway.tatum.io"

   # Sponsor Gas Wallet (for gasless onboarding)
   SPONSOR_WALLET_KEY="your_sponsor_wallet_private_key"
   ```

3. **Deploy Schema & Run Indexer**:
   Ensure your hosting service runs these startup scripts:
   ```bash
   cd server
   npm install
   # Push Prisma schema definitions into PostgreSQL
   npx prisma db push
   # Start the Express API and background indexer
   npm run start
   ```

---

## 4. Step 3: Deploy Frontend Client (Next.js)

The frontend Next.js App is deployed directly on Vercel.

1. **Connect Repository to Vercel**:
   Import your git repository and select `/client` as the root directory.
2. **Configure Client Environment Variables**:
   Add these environment keys:
   ```properties
   # Production API Gateway (pointing to your Railway/Fly.io URL)
   NEXT_PUBLIC_API_URL="https://blobcast-backend-production.up.railway.app"

   # On-chain Move Package Configuration
   NEXT_PUBLIC_SUI_PACKAGE_ID="0xYourDeployedPackageID"

   # Tatum RPC API Key (Client-side Queries)
   NEXT_PUBLIC_TATUM_API_KEY="your_tatum_api_key"
   ```
3. **Trigger Deploy**:
   Vercel will compile, build, and deploy the application, returning a live production URL (e.g. `https://blobcast.vercel.app`).

---

## 5. Developer Testing Checklist

To verify that the entire BlobCast network is successfully online and unified:
- [ ] **Wallet Connect**: Navigate to the homepage, click "Connect Wallet" using a browser wallet (e.g., Suiet, Sui Wallet), and ensure you connect and see your SUI balance.
- [ ] **Sovereign Profile creation**: Click "Register" and fill out username/bio. Verify that a Sui signature request appears and that upon submission, your profile updates.
- [ ] **Blob Posting**: Write a new social cast post, upload an image, sign the sponsored transaction block, and verify that the UI shows your post immediately.
- [ ] **Indexer telemetries**: Open `/api/posts/notifications` in a new tab. Check if the indexer successfully catches and outputs live notifications (e.g. Creator tips, profile upserts).
- [ ] **Tipping mechanism**: Navigate to another user's post, click "Tip Creator", choose an amount of SUI, sign the transaction block, and ensure the creator receives their coin transfer.
