'use client';

import React from 'react';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { tatum } from '@/lib/tatum';
import { JsonRpcHTTPTransport, SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import '@mysten/dapp-kit/dist/index.css';

// Configure the Sui client networks to point directly to our Tatum RPC infrastructure!
const { networkConfig } = createNetworkConfig({
  testnet: { url: tatum.getRpcUrl('testnet'), network: 'testnet' as any },
  mainnet: { url: tatum.getRpcUrl('mainnet'), network: 'mainnet' as any },
});

const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  if (init && init.headers) {
    const headers = init.headers;
    if (headers instanceof Headers) {
      const keysToDelete: string[] = [];
      headers.forEach((_, key) => {
        if (key.toLowerCase().startsWith('client-')) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => headers.delete(key));
    } else if (Array.isArray(headers)) {
      init.headers = headers.filter(
        ([key]) => !key.toLowerCase().startsWith('client-')
      );
    } else {
      const headersRecord = { ...headers } as Record<string, string>;
      Object.keys(headersRecord).forEach(key => {
        if (key.toLowerCase().startsWith('client-')) {
          delete headersRecord[key];
        }
      });
      init.headers = headersRecord;
    }
  }

  try {
    const res = await fetch(input, init);
    if (res.status === 429) {
      console.warn('⚠️ [Tatum RPC] Rate limited (429). Dynamically falling back to SUI public fullnode...');
      const urlStr = typeof input === 'string' ? input : input.toString();
      if (urlStr.includes('tatum.io')) {
        const publicUrl = 'https://fullnode.testnet.sui.io:443';
        return fetch(publicUrl, init);
      }
    }

    if (res.status === 200) {
      const clonedRes = res.clone();
      try {
        const json = await clonedRes.json();
        const isMethodNotFound = (item: any) => item && item.error && item.error.code === -32601;
        const hasError = Array.isArray(json) ? json.some(isMethodNotFound) : isMethodNotFound(json);
        if (hasError) {
          console.warn('⚠️ [Tatum RPC] Method not found (-32601). Dynamically falling back to SUI public fullnode...');
          const urlStr = typeof input === 'string' ? input : input.toString();
          if (urlStr.includes('tatum.io')) {
            const publicUrl = 'https://fullnode.testnet.sui.io:443';
            return fetch(publicUrl, init);
          }
        }
      } catch (_) {}
    }

    return res;
  } catch (err) {
    console.warn('⚠️ [Tatum RPC] Fetch failed, attempting public fullnode fallback...', err);
    const urlStr = typeof input === 'string' ? input : input.toString();
    if (urlStr.includes('tatum.io')) {
      const publicUrl = 'https://fullnode.testnet.sui.io:443';
      return fetch(publicUrl, init);
    }
    throw err;
  }
};

// Single client query instance for DApp Kit
const queryClient = new QueryClient();

export function SuiProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider 
        networks={networkConfig} 
        defaultNetwork="testnet"
        createClient={(name, config) => {
          const transport = new JsonRpcHTTPTransport({
            url: config.url,
            fetch: customFetch
          });
          return new SuiJsonRpcClient({
            transport,
            network: config.network || (name as any)
          });
        }}
      >
        <WalletProvider autoConnect>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
