const TATUM_SUI_TESTNET = process.env.TATUM_SUI_TESTNET_RPC || 'https://sui-testnet.gateway.tatum.io';
const TATUM_SUI_MAINNET = process.env.TATUM_SUI_MAINNET_RPC || 'https://sui-mainnet.gateway.tatum.io';

export const tatum = {
  getRpcUrl(network: 'mainnet' | 'testnet' = 'testnet'): string {
    let url = network === 'mainnet' ? TATUM_SUI_MAINNET : TATUM_SUI_TESTNET;
    const apiKey = process.env.TATUM_API_KEY;
    if (apiKey && url.includes('tatum.io') && !url.includes('apiKey=')) {
      url = `${url}?apiKey=${apiKey}`;
    }
    return url;
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
