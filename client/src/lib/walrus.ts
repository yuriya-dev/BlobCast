// Walrus Decentralized Storage Integration

// Self-cleaning block to clear massive cached media strings in localStorage that cause QuotaExceededError
if (typeof window !== 'undefined') {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        // Find simulated keys or direct 44/64-character hash keys
        const isSimulated = key.startsWith('walrus_sim_');
        const isBlobHash = key.length === 44 || key.length === 64;
        if (isSimulated || isBlobHash) {
          const val = localStorage.getItem(key);
          // If the cached value is a large base64 media string (e.g., > 100KB)
          if (val && val.length > 100000) {
            keysToRemove.push(key);
          }
        }
      }
    }
    if (keysToRemove.length > 0) {
      console.log(`🧹 Antigravity Self-Cleaning: Removing ${keysToRemove.length} large base64 items from localStorage to reclaim quota.`);
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
  } catch (e) {
    console.warn("⚠️ Failed to self-clean localStorage:", e);
  }
}

export interface WalrusBlobInfo {
  blobId: string;
  size: number;
  registeredEpoch: number;
  startEpoch: number;
  endEpoch: number;
  shardsCount: number;
  isSimulated: boolean;
  shardsMap: Array<{
    nodeId: number;
    nodeName: string;
    location: string;
    shards: number[];
    status: 'online' | 'offline' | 'degraded';
    latencyMs: number;
  }>;
}

const WALRUS_PUBLISHER = process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space';
const WALRUS_AGGREGATOR = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';

// Generate mock storage nodes for visualization
function generateMockStorageNodes(blobId: string, size: number): WalrusBlobInfo['shardsMap'] {
  const locations = [
    { name: 'Sui-Node-SG', loc: 'Singapore' },
    { name: 'Walrus-Node-DE', loc: 'Frankfurt' },
    { name: 'Ocean-Storage-US-E', loc: 'Virginia' },
    { name: 'Deep-Space-US-W', loc: 'Oregon' },
    { name: 'Tatum-Index-NL', loc: 'Amsterdam' },
    { name: 'Blob-Vault-JP', loc: 'Tokyo' },
  ];

  // Seed pseudo-randomness based on blobId string hash
  let hash = 0;
  for (let i = 0; i < blobId.length; i++) {
    hash = blobId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const shardsMap: WalrusBlobInfo['shardsMap'] = [];
  const totalShards = 120;
  const shardsPerNode = Math.floor(totalShards / locations.length);

  for (let i = 0; i < locations.length; i++) {
    const nodeHash = Math.abs(hash + i * 17);
    const statusRand = nodeHash % 100;
    let status: 'online' | 'offline' | 'degraded' = 'online';
    if (statusRand < 5) status = 'offline';
    else if (statusRand < 15) status = 'degraded';

    const nodeShards: number[] = [];
    for (let s = 0; s < shardsPerNode; s++) {
      nodeShards.push(i * shardsPerNode + s);
    }

    shardsMap.push({
      nodeId: i + 1,
      nodeName: locations[i].name,
      location: locations[i].loc,
      shards: nodeShards,
      status,
      latencyMs: status === 'offline' ? 0 : 30 + (nodeHash % 120),
    });
  }

  return shardsMap;
}

// IndexedDB Simulator to persist massive simulated base64 media files across page refreshes
class IndexedDBSimulator {
  private dbName = 'walrus_sim_db';
  private storeName = 'blobs';
  private db: IDBDatabase | null = null;

  private init(): Promise<IDBDatabase> {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not supported on the server side'));
        return;
      }
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      const db = await this.init();
      return new Promise((resolve) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);
        request.onsuccess = () => {
          resolve(request.result || null);
        };
        request.onerror = () => {
          resolve(null);
        };
      });
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      const db = await this.init();
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(value, key);
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (err) {
      console.error('⚠️ IndexedDB write failed:', err);
    }
  }
}

const idbSimulator = typeof window !== 'undefined' ? new IndexedDBSimulator() : null;

// RAM-backed Simulated Storage fallback to avoid LocalStorage QuotaExceededErrors on massive image uploads
const simulatedMemoryStore = new Map<string, string>();

export const walrus = {
  /**
   * Upload raw JSON or string content to Walrus publisher
   */
  async uploadBlob(content: string | Record<string, any>, epochs: number = 26): Promise<WalrusBlobInfo> {
    const serialized = typeof content === 'string' ? content : JSON.stringify(content);
    const size = new Blob([serialized]).size;

    const handlePublishResponse = async (response: Response): Promise<WalrusBlobInfo | null> => {
      if (!response.ok) return null;

      const data = await response.json().catch(() => null);
      if (!data) return null;

      const blobObject = data.newlyCreated?.blobObject || data.alreadyCertified?.blobObject;
      if (!blobObject) return null;

      const blobId = blobObject.blobId;

      // Cache the content locally so it can be resolved instantly on the same machine
      if (typeof window !== 'undefined') {
        try {
          if (serialized.length < 100000) {
            localStorage.setItem(blobId, serialized);
          } else {
            simulatedMemoryStore.set(blobId, serialized);
          }
        } catch (err) {
          console.warn("⚠️ LocalStorage quota exceeded. Falling back to in-memory store.");
          simulatedMemoryStore.set(blobId, serialized);
        }

        // Bulletproof IndexedDB caching for large uploads (like 9.6MB files) so they survive refreshes
        if (idbSimulator) {
          idbSimulator.set(blobId, serialized).catch(() => {});
        }
      }

      return {
        blobId,
        size,
        registeredEpoch: blobObject.registeredEpoch || 1,
        startEpoch: blobObject.storage?.startEpoch || 1,
        endEpoch: blobObject.storage?.endEpoch || (1 + epochs),
        shardsCount: blobObject.erasureCodingInfo?.shards || 120,
        isSimulated: false,
        shardsMap: generateMockStorageNodes(blobId, size),
      };
    };

    const apiBaseUrl = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api')
      : 'http://localhost:8080/api';

    if (typeof window !== 'undefined') {
      try {
        const authResponse = await fetch(`${apiBaseUrl}/walrus/auth`, {
          method: 'POST',
          body: JSON.stringify({ epochs, size }),
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(15000),
        });

        if (authResponse.ok) {
          const authData = await authResponse.json().catch(() => null);
          const token = authData?.data?.token || authData?.token;
          if (token) {
            const response = await fetch(`${WALRUS_PUBLISHER}/v1/blobs?epochs=${epochs}`, {
              method: 'PUT',
              body: serialized,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              signal: AbortSignal.timeout(120000),
            });

            const info = await handlePublishResponse(response);
            if (info) return info;
          }
        }
      } catch (e) {
        console.warn('⚠️ Failed to publish with signed JWT. Falling back to backend proxy.', e);
      }

      try {
        const response = await fetch(`${apiBaseUrl}/walrus/publish`, {
          method: 'POST',
          body: JSON.stringify({ content: serialized, epochs }),
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(120000),
        });

        const info = await handlePublishResponse(response);
        if (info) return info;
      } catch (e) {
        console.warn('⚠️ Failed to publish via backend Walrus proxy. Falling back to direct publisher.', e);
      }
    }

    // If we reach here, publishing failed. Do not fall back to simulated storage.
    throw new Error('Failed to publish blob to Walrus publisher (no simulated fallback allowed).');
  },

  /**
   * Retrieve raw blob contents from aggregator
   */
  async getBlob<T = any>(blobId: string): Promise<T | string> {
    const cleanId = blobId.replace('walrus://', '');

    // Detect known mock/placeholder blob IDs that don't exist on Walrus
    // These are seeded in the local mock database for development testing purposes
    const isMockPlaceholder = cleanId.startsWith('blob-') ||
      cleanId.startsWith('post-') ||
      cleanId === '' ||
      cleanId.length < 10;

    if (isMockPlaceholder) {
      // Return a graceful default payload so the feed doesn't crash on demo seed data
      return {
        content: {
          text: 'This post is stored on the Walrus decentralized network.',
          hashtags: ['blobcast', 'walrus'],
        },
        media: [],
      } as unknown as T;
    }

    // ALWAYS check local synchronous storage (localStorage / RAM memory) first for ALL blobIds
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(cleanId) || simulatedMemoryStore.get(cleanId);
      if (cached) {
        try {
          const cleanContent = cached.startsWith('"') && cached.endsWith('"')
            ? JSON.parse(cached)
            : cached;
          return typeof cleanContent === 'string' ? JSON.parse(cleanContent) as T : cleanContent as T;
        } catch {
          return cached as unknown as T;
        }
      }
    }

    // Check IndexedDB asynchronously for ALL blobIds before falling back to remote network fetch
    if (typeof window !== 'undefined' && idbSimulator) {
      try {
        const dbCached = await idbSimulator.get(cleanId);
        if (dbCached) {
          // Re-cache back into RAM memory store for instant subsequent access
          simulatedMemoryStore.set(cleanId, dbCached);
          try {
            const cleanContent = dbCached.startsWith('"') && dbCached.endsWith('"')
              ? JSON.parse(dbCached)
              : dbCached;
            return typeof cleanContent === 'string' ? JSON.parse(cleanContent) as T : cleanContent as T;
          } catch {
            return dbCached as unknown as T;
          }
        }
      } catch (err) {
        console.warn('⚠️ IndexedDB check failed in getBlob:', err);
      }
    }

    // Check if it's simulated
    if (cleanId.startsWith('walrus_sim_')) {
      let content: string | null = null;
      if (typeof window !== 'undefined') {
        content = localStorage.getItem(cleanId) || simulatedMemoryStore.get(cleanId) || null;
        
        // If not found in localStorage or RAM (e.g. after page refresh), read asynchronously from IndexedDB!
        if (!content && idbSimulator) {
          content = await idbSimulator.get(cleanId);
          if (content) {
            // Re-cache back into RAM for instant subsequent access
            simulatedMemoryStore.set(cleanId, content);
          }
        }
      } else {
        try {
          const { cache } = eval('require')('./redis');
          content = await cache.get(cleanId);
        } catch (err) {
          console.warn("⚠️ Failed to load server-side Redis cache helper:", err);
        }
      }

      if (!content) {
        try {
          const syncUrl = `${typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api') : 'http://localhost:8080/api'}/walrus/blobs/${cleanId}`;
          const res = await fetch(syncUrl);
          if (res.ok) {
            const rawText = await res.text();
            if (rawText) {
              content = rawText;
              // Cache it locally so subsequent calls are instant
              if (typeof window !== 'undefined') {
                try {
                  if (content.length < 100000) {
                    localStorage.setItem(cleanId, content);
                  } else {
                    simulatedMemoryStore.set(cleanId, content);
                  }
                } catch {}
                simulatedMemoryStore.set(cleanId, content);
              }
            }
          }
        } catch (syncErr) {
          console.warn('⚠️ Failed to fetch simulated blob from backend database:', syncErr);
        }
      }

      if (!content) {
        // Graceful fallback: simulated blob expired or lost (e.g. after server restart / DB reset).
        // Return a default payload so the feed/profile doesn't crash.
        console.warn(`⚠️ Simulated Walrus Blob ID ${cleanId} not found or expired. Returning fallback content.`);
        return {
          content: {
            text: 'This post was stored on the Walrus decentralized network.',
            hashtags: ['blobcast', 'walrus'],
          },
          media: [],
        } as unknown as T;
      }

      try {
        // If content is wrapped in quotes, it might be a double-stringified JSON
        const cleanContent = content.startsWith('"') && content.endsWith('"')
          ? JSON.parse(content)
          : content;
        return typeof cleanContent === 'string' ? JSON.parse(cleanContent) as T : cleanContent as T;
      } catch {
        return content as unknown as T;
      }
    }

    try {
      // Bypass direct decentralized aggregator calls in the browser to prevent network connection queue blocks.
      // Instead, fetch from our unified Express backend proxy which caches the parsed results in PostgreSQL.
      const baseUrl = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api') : 'http://localhost:8080/api';
      const response = await fetch(`${baseUrl}/walrus/blobs/${cleanId}`, {
        signal: AbortSignal.timeout(3000), // strict timeout
      });

      if (response.ok) {
        const text = await response.text();

        // Cache the content locally so subsequent calls are synchronous and instant!
        if (typeof window !== 'undefined') {
          try {
            if (text.length < 100000) {
              localStorage.setItem(cleanId, text);
            } else {
              simulatedMemoryStore.set(cleanId, text);
            }
          } catch {}
          simulatedMemoryStore.set(cleanId, text);
          if (idbSimulator) {
            idbSimulator.set(cleanId, text).catch(() => {});
          }
        }

        try {
          return JSON.parse(text) as T;
        } catch {
          return text as unknown as T;
        }
      }
    } catch (e) {
      console.warn(`⚠️ Failed to proxy read from Express aggregator proxy for ${cleanId}.`, e);
    }

    throw new Error(`Walrus Blob ID ${cleanId} could not be retrieved from aggregator proxy.`);
  },

  /**
   * Extract info & details for visualizer mapping
   */
  getBlobDetails(blobId: string, size: number = 2048): WalrusBlobInfo {
    const cleanId = blobId.replace('walrus://', '');
    const isSimulated = cleanId.startsWith('walrus_sim_');
    return {
      blobId: cleanId,
      size,
      registeredEpoch: isSimulated ? 22 : 12,
      startEpoch: isSimulated ? 22 : 12,
      endEpoch: isSimulated ? 27 : 17,
      shardsCount: 120,
      isSimulated,
      shardsMap: generateMockStorageNodes(cleanId, size),
    };
  },

  /**
   * Resolve a Walrus blob ID to a URL that can be used directly in an <img> tag's src.
   * If it's a simulated blob, it will fetch the base64 string from localStorage or memory store.
   * If it's a real blob, it will point to the aggregator URL.
   */
  resolveImageUrl(blobId: string | null | undefined): string {
    if (!blobId) return '';
    
    // Clean prefix if any
    const cleanId = blobId.replace('walrus://', '');

    // ALWAYS check local storage first for ANY blobId (both simulated and real)
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(cleanId) || simulatedMemoryStore.get(cleanId);
      if (cached) {
        // If the cached content is wrapped in quotes
        if (cached.startsWith('"') && cached.endsWith('"')) {
          try {
            return JSON.parse(cached);
          } catch {
            return cached;
          }
        }
        return cached;
      }
    }
    
    if (cleanId.startsWith('walrus_sim_')) {
      const baseUrl = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api') : 'http://localhost:8080/api';
      return `${baseUrl}/walrus/blobs/${cleanId}/image`;
    }
    
    // Fallbacks for mock avatars in db.ts to make the design look stunning
    if (cleanId.includes('avatar') || cleanId.includes('banner')) {
      if (cleanId.includes('vitalik-avatar')) return 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=150&q=80';
      if (cleanId.includes('vitalik-banner')) return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
      if (cleanId.includes('yuriya-avatar')) return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';
      if (cleanId.includes('yuriya-banner')) return 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=80';
      if (cleanId.includes('mysten-avatar')) return 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=150&q=80';
      if (cleanId.includes('mysten-banner')) return 'https://images.unsplash.com/photo-1639762681057-408e52192e55?auto=format&fit=crop&w=1200&q=80';
      return `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanId}`;
    }

    // Detect known mock/placeholder blob IDs and skip aggregator fetch
    const isMockPlaceholder = cleanId.startsWith('blob-') ||
      cleanId.startsWith('post-') ||
      cleanId === '' ||
      cleanId.length < 10;

    if (isMockPlaceholder) {
      return '';
    }
    
    // Return Express backend binary image proxy endpoint (decodes base64 and serves with correct content-type)
    const baseUrl = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api') : 'http://localhost:8080/api';
    return `${baseUrl}/walrus/blobs/${cleanId}/image`;
  }
};
