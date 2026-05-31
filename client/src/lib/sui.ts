import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';

const PACKAGE_ID = process.env.NEXT_PUBLIC_BLOBCAST_PACKAGE_ID || '0x4bc09fab7a23048ac3a827c468db938752c7aee12e96d31c6551ea2607167f07';
const CLOCK_ID = '0x6';

/**
 * Compute SHA-256 hash of a string content and return as Uint8Array
 */
export async function computeSha256(content: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

/**
 * Converts a Uint8Array hash into a standard hex string or string representation
 */
export function hashToHex(hashBytes: Uint8Array): string {
  return 'sha256-' + Array.from(hashBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Build a transaction block to register a new cast post on the Sui blockchain.
 */
export function buildPublishPostTransaction(
  walrusBlobId: string,
  blobHashBytes: Uint8Array,
  contentType: number,
  visibility: number,
  replyToId: string | null = null,
  repostOfId: string | null = null,
): Transaction {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::post::create_post`,
    arguments: [
      tx.pure.string(walrusBlobId),
      tx.pure.vector('u8', blobHashBytes),
      tx.pure.u8(contentType),
      tx.pure.u8(visibility),
      tx.pure.option('address', replyToId),
      tx.pure.option('address', repostOfId),
      tx.object(CLOCK_ID),
    ],
  });

  return tx;
}

/**
 * Helper to extract the newly created Sui Object ID from execution effects
 */
export function parseCreatedObjectId(executionResult: any): string | null {
  if (!executionResult) return null;
  
  // The signAndExecuteTransaction hook returns the transaction response.
  // We can look for created objects in the transaction effects:
  try {
    const effects = executionResult.effects;
    if (effects && effects.created && effects.created.length > 0) {
      // Find the object created by the transaction
      // Typically the post object is shared or created, so it's in the created list.
      const createdObj = effects.created[0];
      if (createdObj && createdObj.reference) {
        return createdObj.reference.objectId;
      }
    }
  } catch (err) {
    console.warn('⚠️ Failed parsing created object ID from execution effects:', err);
  }
  
  return null;
}
