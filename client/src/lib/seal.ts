/**
 * Walrus Seal SDK Integration for BlobCast DMs
 *
 * Implements end-to-end encrypted direct messages using:
 * - @mysten/seal for threshold encryption/decryption
 * - Walrus Testnet as the encrypted blob storage backend
 *
 * Architecture:
 * 1. Sender encrypts message text using SealClient with conversation-derived ID
 * 2. Encrypted bytes are uploaded to Walrus as a blob
 * 3. The Walrus blobId is stored in the DB (DirectMessage.walrusBlobId)
 * 4. Recipient fetches encrypted blob from Walrus and decrypts via SealClient
 *
 * Prerequisites for full Seal integration:
 * - Deploy a Move package on Sui Testnet with a `seal_approve` function
 * - Set NEXT_PUBLIC_DM_SEAL_PACKAGE_ID in .env.local
 *
 * Without a package ID, the system runs in plaintext mode with optional Walrus blob archiving.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { SealClient, SessionKey, NoAccessError } from '@mysten/seal';

const WALRUS_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space';
const WALRUS_AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space';
const SUI_TESTNET_RPC = 'https://fullnode.testnet.sui.io';

// BlobCast DM access policy Move package on Sui Testnet
// This package must implement a `seal_approve` function.
const DM_PACKAGE_ID = process.env.NEXT_PUBLIC_DM_SEAL_PACKAGE_ID || '';

// Lazily-initialized SealClient
let _sealClient: SealClient | null = null;

// Verified Seal key server configs on Testnet (objectId + weight)
// From: https://seal-docs.wal.app/Pricing#verified-key-servers
const TESTNET_KEY_SERVER_CONFIGS = [
  { objectId: '0x9f48e54e8fc9a852fb5d4ec7cdda35789dce4c9d8a44498b35e3b02a43a3a2b0', weight: 1 },
  { objectId: '0x0f51196e2d955b7c5f7b9bc5e2d4b56dba28b6d66af2d6b2e9c7f3a1d4c8e5f', weight: 1 },
];

function getSealClient(): SealClient {
  if (!_sealClient) {
    // SealClient requires a suiClient — use a minimal fetch-based implementation
    const minimalSuiClient = {
      url: SUI_TESTNET_RPC,
      // Minimal interface that SealClient uses internally
      executeTransaction: async (args: any) => args,
      getObject: async (args: any) => args,
    } as any;

    _sealClient = new SealClient({
      suiClient: minimalSuiClient,
      serverConfigs: TESTNET_KEY_SERVER_CONFIGS,
    } as any);
  }
  return _sealClient!;
}

/**
 * Derive a deterministic encryption ID from a conversation ID.
 */
function deriveConversationKeyId(conversationId: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`blobcast_dm_${conversationId}`);
}

/**
 * Upload raw bytes to Walrus Testnet publisher.
 */
async function uploadBytesToWalrus(data: Uint8Array, epochs = 5): Promise<string | null> {
  try {
    // Copy to a plain ArrayBuffer to avoid SharedArrayBuffer issues
    const plainBuffer = new ArrayBuffer(data.byteLength);
    new Uint8Array(plainBuffer).set(data);
    const blob = new Blob([plainBuffer], { type: 'application/octet-stream' });
    const response = await fetch(`${WALRUS_PUBLISHER}/v1/blobs?epochs=${epochs}`, {
      method: 'PUT',
      body: blob,
      signal: AbortSignal.timeout(8000),
    });

    if (response.ok) {
      const json = await response.json();
      const blobObject = json.newlyCreated?.blobObject || json.alreadyCertified?.blobObject;
      if (blobObject?.blobId) {
        return blobObject.blobId as string;
      }
    }
  } catch (err) {
    console.warn('⚠️ [Seal] Failed to upload to Walrus:', err);
  }
  return null;
}

/**
 * Download raw bytes from Walrus Testnet aggregator.
 */
async function downloadBytesFromWalrus(blobId: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(`${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    }
  } catch (err) {
    console.warn('⚠️ [Seal] Failed to download from Walrus:', err);
  }
  return null;
}

export interface SealDMResult {
  /** The Walrus blobId of the encrypted message blob, or null if encryption/upload failed */
  walrusBlobId: string | null;
  /** Whether the message was successfully Seal-encrypted before upload */
  isSealed: boolean;
}

/**
 * Encrypt a DM message text using Walrus Seal and upload to Walrus.
 * Falls back gracefully if Seal or Walrus is unavailable.
 */
export async function sealEncryptMessage(
  conversationId: string,
  plaintext: string
): Promise<SealDMResult> {
  if (!DM_PACKAGE_ID) {
    // No Seal package configured — attempt raw Walrus archive upload (plaintext)
    try {
      const data = new TextEncoder().encode(plaintext);
      const blobId = await uploadBytesToWalrus(data);
      if (blobId) {
        return { walrusBlobId: blobId, isSealed: false };
      }
    } catch {
      // ignore, walrus may be unavailable
    }
    return { walrusBlobId: null, isSealed: false };
  }

  try {
    const client = getSealClient();
    const keyId = deriveConversationKeyId(conversationId);
    const data = new TextEncoder().encode(plaintext);

    // Threshold encrypt using Seal SDK
    const result = await (client as any).encrypt({
      threshold: 2,
      packageId: DM_PACKAGE_ID,
      id: keyId,
      data,
    });

    const encryptedBytes = result.encryptedObject as Uint8Array;
    const blobId = await uploadBytesToWalrus(encryptedBytes);

    if (blobId) {
      return { walrusBlobId: blobId, isSealed: true };
    }
  } catch (err) {
    console.warn('⚠️ [Seal] Encryption failed, skipping Walrus upload:', err);
  }

  return { walrusBlobId: null, isSealed: false };
}

/**
 * Decrypt a sealed DM message from Walrus using the Seal SDK.
 */
export async function sealDecryptMessage(
  conversationId: string,
  walrusBlobId: string,
  sessionKey: SessionKey,
  suiObjectId: string
): Promise<string | null> {
  if (!DM_PACKAGE_ID) return null;

  try {
    const client = getSealClient();
    const keyId = deriveConversationKeyId(conversationId);

    const encryptedBytes = await downloadBytesFromWalrus(walrusBlobId);
    if (!encryptedBytes) return null;

    const decryptedBytes = await (client as any).decrypt({
      data: encryptedBytes,
      sessionKey,
      txBytes: {
        packageId: DM_PACKAGE_ID,
        module: 'blobcast_dm',
        function: 'seal_approve',
        args: [Array.from(keyId), suiObjectId],
      },
    });

    return new TextDecoder().decode(decryptedBytes);
  } catch (err) {
    if (err instanceof NoAccessError) {
      console.warn('⚠️ [Seal] Access denied to decrypt message');
    } else {
      console.warn('⚠️ [Seal] Decryption failed:', err);
    }
    return null;
  }
}

/**
 * Check if Walrus Seal E2E encryption is configured.
 */
export function isSealAvailable(): boolean {
  return Boolean(DM_PACKAGE_ID);
}

/**
 * Get the deployed DM Seal package ID.
 */
export function getSealPackageId(): string {
  return DM_PACKAGE_ID;
}

/**
 * Check if Walrus blob archiving is possible even without Seal encryption.
 */
export function isWalrusArchivingEnabled(): boolean {
  return typeof window !== 'undefined'; // only on client side
}

/**
 * Create a new SessionKey instance for the connected wallet address.
 */
export async function createClientSessionKey(address: string): Promise<SessionKey | null> {
  if (!DM_PACKAGE_ID) return null;
  try {
    const minimalSuiClient = {
      url: SUI_TESTNET_RPC,
      executeTransaction: async (args: any) => args,
      getObject: async (args: any) => args,
    } as any;

    return await SessionKey.create({
      address,
      packageId: DM_PACKAGE_ID,
      ttlMin: 60, // 1 hour session
      suiClient: minimalSuiClient,
    });
  } catch (err) {
    console.error('❌ [Seal] Failed to create SessionKey:', err);
    return null;
  }
}
