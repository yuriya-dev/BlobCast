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
    
    // 1. Try synchronous cache lookup first (localStorage or RAM store) for both real and simulated blobs
    const syncUrl = walrus.resolveImageUrl(blobId);
    if (syncUrl && syncUrl.startsWith('data:')) {
      setImageUrl(syncUrl);
      return;
    }

    // 2. Mock fallbacks, SVGs, and direct http/https URLs resolve synchronously instantly
    const isMockOrHttp = !cleanId.startsWith('walrus_sim_') && (
      cleanId.includes('avatar') || 
      cleanId.includes('banner') || 
      cleanId.startsWith('http') || 
      cleanId.startsWith('blob-') ||
      cleanId.startsWith('post-') ||
      cleanId.length < 15
    );

    if (isMockOrHttp) {
      setImageUrl(syncUrl);
      return;
    }

    // 3. Otherwise (real or simulated blobs not in memory), fetch asynchronously via getBlob to populate RAM/localStorage, then resolve
    let active = true;
    
    walrus.getBlob(cleanId)
      .then((content) => {
        if (active) {
          if (content && typeof content === 'string' && content.startsWith('data:')) {
            setImageUrl(content);
          } else {
            // Fallback to direct aggregator URL
            setImageUrl(syncUrl);
          }
        }
      })
      .catch((err) => {
        console.warn(`⚠️ Failed to load image blob ${cleanId} asynchronously:`, err);
        if (active) {
          setImageUrl(syncUrl);
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
