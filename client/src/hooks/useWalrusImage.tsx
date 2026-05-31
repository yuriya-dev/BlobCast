'use client';

import React, { useState, useEffect } from 'react';
import { walrus } from '@/lib/walrus';

/**
 * Custom React hook to resolve a Walrus blob ID to a loadable URL (base64 or aggregator) asynchronously.
 * Specially designed to handle simulated IndexedDB fallback loading seamlessly after page refreshes.
 */
export function useWalrusImage(blobId: string | null | undefined): string {
  const [imageUrl, setImageUrl] = useState<string>('');

  useEffect(() => {
    if (!blobId) {
      setImageUrl('');
      return;
    }

    const cleanId = blobId.replace('walrus://', '');
    
    // 1. Try synchronous cache lookup — resolveImageUrl checks localStorage/RAM
    const syncUrl = walrus.resolveImageUrl(blobId);
    
    // 2. If the resolved URL is a data: URI or any HTTP(S) URL, we can set it directly.
    //    This covers: cached base64 from localStorage, backend /image endpoint, aggregator URLs.
    //    Browser handles the HTTP fetch natively for img src.
    if (syncUrl && (syncUrl.startsWith('data:') || syncUrl.startsWith('http'))) {
      setImageUrl(syncUrl);
      return;
    }

    // 3. For blobs not yet resolvable (no cache, not walrus_sim_), try async getBlob
    //    which will fetch from IndexedDB or backend and re-populate the cache.
    let active = true;
    
    walrus.getBlob(cleanId)
      .then((content) => {
        if (!active) return;

        // After getBlob runs, localStorage/memory cache is populated.
        // Re-call resolveImageUrl — it will now find the cached data.
        const resolvedAfterFetch = walrus.resolveImageUrl(cleanId);
        if (resolvedAfterFetch && (resolvedAfterFetch.startsWith('data:') || resolvedAfterFetch.startsWith('http'))) {
          setImageUrl(resolvedAfterFetch);
          return;
        }

        // Handle case where content itself is the base64 string
        if (content && typeof content === 'string' && content.startsWith('data:')) {
          setImageUrl(content);
          return;
        }

        // Handle case where content is a JSON string wrapping a base64 string
        if (content && typeof content === 'string') {
          try {
            const parsed = JSON.parse(content);
            if (typeof parsed === 'string' && parsed.startsWith('data:')) {
              setImageUrl(parsed);
              return;
            }
          } catch {}
        }

        // Final fallback
        if (syncUrl) setImageUrl(syncUrl);
      })
      .catch((err) => {
        console.warn(`⚠️ Failed to load image blob ${cleanId} asynchronously:`, err);
        if (active && syncUrl) setImageUrl(syncUrl);
      });

    return () => {
      active = false;
    };
  }, [blobId]);

  return imageUrl;
}

export interface WalrusImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  blobId: string | null | undefined;
}

export function WalrusImage({ blobId, ...props }: WalrusImageProps) {
  const imageUrl = useWalrusImage(blobId);
  if (!imageUrl) return null;
  return <img src={imageUrl} {...props} />;
}
