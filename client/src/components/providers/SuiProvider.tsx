'use client';

import React from 'react';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { tatum } from '@/lib/tatum';
import '@mysten/dapp-kit/dist/index.css';

// Configure the Sui client networks to point directly to our Tatum RPC infrastructure!
const { networkConfig } = createNetworkConfig({
  testnet: { url: tatum.getRpcUrl('testnet'), network: 'testnet' as any },
  mainnet: { url: tatum.getRpcUrl('mainnet'), network: 'mainnet' as any },
});

// Single client query instance for DApp Kit
const queryClient = new QueryClient();

export function SuiProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
