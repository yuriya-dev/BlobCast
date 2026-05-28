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
    
    // Non-simulated URLs (Unsplash mock fallbacks, SVGs, real aggregator endpoints) resolve synchronously instantly
    if (!cleanId.startsWith('walrus_sim_') || cleanId.includes('avatar') || cleanId.includes('banner')) {
      setImageUrl(walrus.resolveImageUrl(blobId));
      return;
    }

    // Try synchronous cache lookup first (localStorage or RAM store)
    const syncUrl = walrus.resolveImageUrl(blobId);
    if (syncUrl) {
      setImageUrl(syncUrl);
      return;
    }

    // If simulated but not in synchronous memory (e.g. after refresh, residing in IndexedDB),
    // fetch asynchronously via getBlob to populate RAM/localStorage, then resolve
    let active = true;
    
    walrus.getBlob(cleanId)
      .then(() => {
        if (active) {
          const resolved = walrus.resolveImageUrl(cleanId);
          setImageUrl(resolved);
        }
      })
      .catch((err) => {
        console.warn(`⚠️ Failed to load simulated image blob ${cleanId} asynchronously:`, err);
        if (active) {
          setImageUrl('');
        }
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
