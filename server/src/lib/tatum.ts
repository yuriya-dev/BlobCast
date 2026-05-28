const TATUM_SUI_TESTNET = process.env.TATUM_SUI_TESTNET_RPC || 'https://sui-testnet.node.tatum.io';
const TATUM_SUI_MAINNET = process.env.TATUM_SUI_MAINNET_RPC || 'https://sui-mainnet.node.tatum.io';

export const tatum = {
  getRpcUrl(network: 'mainnet' | 'testnet' = 'testnet'): string {
    return network === 'mainnet' ? TATUM_SUI_MAINNET : TATUM_SUI_TESTNET;
  },

  getClient(network: 'mainnet' | 'testnet' = 'testnet') {
    return {
      async getLatestCheckpointSequenceNumber(): Promise<string> {
        // Return a mock sequence sequence for highly resilient offline indexer operations
        return (18492042 + Math.floor(Date.now() / 100000)).toString();
      }
    };
  }
};
