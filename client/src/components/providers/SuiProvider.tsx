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

const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
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
  return fetch(input, init);
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
