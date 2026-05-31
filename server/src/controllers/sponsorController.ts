import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { AppError } from '../utils/appError';

const KEY_FILE = path.join(__dirname, '../../sponsor_wallet.key');
const PACKAGE_ID = process.env.BLOBCAST_PACKAGE_ID || '0x4bc09fab7a23048ac3a827c468db938752c7aee12e96d31c6551ea2607167f07';
const CLOCK_ID = '0x6';

// Dynamic import helper to bypass ESM-CommonJS compile/runtime issues
const importDynamic = new Function('modulePath', 'return import(modulePath)');

const customFetch = async (input: any, init?: any) => {
    try {
        const res = await fetch(input, init);
        if (res.status === 429) {
            console.warn('⚠️ [Backend Tatum RPC] Rate limited (429). Dynamically falling back to SUI public fullnode...');
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
                    console.warn('⚠️ [Backend Tatum RPC] Method not found (-32601). Dynamically falling back to SUI public fullnode...');
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
        console.warn('⚠️ [Backend Tatum RPC] Fetch failed, attempting public fullnode fallback...', err);
        const urlStr = typeof input === 'string' ? input : input.toString();
        if (urlStr.includes('tatum.io')) {
            const publicUrl = 'https://fullnode.testnet.sui.io:443';
            return fetch(publicUrl, init);
        }
        throw err;
    }
};

let sdkLoaded = false;
let SuiClient: any;
let JsonRpcHTTPTransport: any;
let Ed25519Keypair: any;
let Transaction: any;
let suiClient: any;
let sponsorKeypair: any;
let sponsorAddress: string = '';

async function ensureSdkLoaded() {
    if (sdkLoaded) return;
    try {
        const clientMod = await importDynamic('@mysten/sui/jsonRpc');
        const keypairsMod = await importDynamic('@mysten/sui/keypairs/ed25519');
        const txMod = await importDynamic('@mysten/sui/transactions');

        SuiClient = clientMod.SuiJsonRpcClient;
        JsonRpcHTTPTransport = clientMod.JsonRpcHTTPTransport;
        Ed25519Keypair = keypairsMod.Ed25519Keypair;
        Transaction = txMod.Transaction;

        let SUI_RPC_URL = 'https://fullnode.testnet.sui.io:443';
        const tatumRpc = process.env.TATUM_SUI_TESTNET_RPC;
        const apiKey = process.env.TATUM_API_KEY;

        if (tatumRpc) {
            let normalizedRpc = tatumRpc;
            // Correct the incorrect hostname from .env if present
            if (tatumRpc.includes('sui-testnet.node.tatum.io')) {
                normalizedRpc = 'https://sui-testnet.gateway.tatum.io';
            }
            
            if (apiKey && !normalizedRpc.includes('apiKey=')) {
                SUI_RPC_URL = `${normalizedRpc}?apiKey=${apiKey}`;
            } else {
                SUI_RPC_URL = normalizedRpc;
            }
        }
        
        const transport = new JsonRpcHTTPTransport({
            url: SUI_RPC_URL,
            fetch: customFetch
        });
        suiClient = new SuiClient({ transport });

        // Initialize sponsor keypair
        sponsorKeypair = getSponsorKeypairInternal();
        sponsorAddress = sponsorKeypair.getPublicKey().toSuiAddress();
        console.log(`⛽ [Gas Station] Active Sponsor Wallet Address: ${sponsorAddress}`);

        sdkLoaded = true;
    } catch (err) {
        console.error('❌ Failed to dynamically load Sui SDK:', err);
        throw err;
    }
}

// Eagerly load the SDK on startup to log the active Sponsor Wallet Address
ensureSdkLoaded().catch((err) => {
    console.error('❌ Failed to initialize Sui SDK at server startup:', err);
});

/**
 * Resolves or generates a persistent, stable sponsor keypair
 */
function getSponsorKeypairInternal(): any {
    // 1. Check env first
    if (process.env.SPONSOR_PRIVATE_KEY) {
        try {
            return Ed25519Keypair.fromSecretKey(process.env.SPONSOR_PRIVATE_KEY);
        } catch (err) {
            console.error('❌ Failed loading SPONSOR_PRIVATE_KEY from environment:', err);
        }
    }

    // 2. Check local file next
    if (fs.existsSync(KEY_FILE)) {
        try {
            const savedPrivKey = fs.readFileSync(KEY_FILE, 'utf-8').trim();
            return Ed25519Keypair.fromSecretKey(savedPrivKey);
        } catch (err) {
            console.error('❌ Failed loading sponsor key from file:', err);
        }
    }

    // 3. Generate stable random fallback
    const keypair = new Ed25519Keypair();
    const secretKey = keypair.getSecretKey();
    try {
        fs.writeFileSync(KEY_FILE, secretKey, 'utf-8');
        console.log(`✨ Generated a new stable Sponsor wallet. Private key saved to: ${KEY_FILE}`);
    } catch (err) {
        console.error('❌ Failed saving generated sponsor keypair:', err);
    }
    return keypair;
}

/**
 * GET /api/sponsor/address
 * Expose active sponsor address and current SUI balance
 */
export async function getSponsorAddress(req: Request, res: Response, next: NextFunction) {
    try {
        await ensureSdkLoaded();
        let balanceMist = '0';
        try {
            const balanceRes = await suiClient.getBalance({ owner: sponsorAddress, coinType: '0x2::sui::SUI' });
            balanceMist = balanceRes.totalBalance;
        } catch (err) {
            console.warn('⚠️ Failed fetching sponsor balance from Sui RPC:', err);
        }

        res.status(200).json({
            status: 'success',
            data: {
                address: sponsorAddress,
                balance: (Number(balanceMist) / 1_000_000_000).toFixed(4),
                balanceMist
            }
        });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/sponsor
 * Construct, build, and sign a sponsored transaction block for social post creations
 */
export async function sponsorTransaction(req: Request, res: Response, next: NextFunction) {
    try {
        await ensureSdkLoaded();
        const {
            senderAddress,
            walrusBlobId,
            blobHash,
            contentType,
            visibility,
            replyToId,
            repostOfId
        } = req.body;

        if (!senderAddress || !walrusBlobId || !blobHash) {
            return next(new AppError('Missing required parameters: senderAddress, walrusBlobId, and blobHash are required.', 400));
        }

        // Verify sponsor balance
        let balanceMist = 0;
        try {
            const balanceRes = await suiClient.getBalance({ owner: sponsorAddress, coinType: '0x2::sui::SUI' });
            balanceMist = Number(balanceRes.totalBalance);
        } catch (err) {
            console.warn('⚠️ RPC balance query failed, proceeding with simulation:', err);
        }

        // Standard testnet gas budget for create_post is ~5,000,000 MIST (0.005 SUI)
        const MIN_GAS_REQUIRED = 5000000;
        if (balanceMist < MIN_GAS_REQUIRED) {
            return next(new AppError(`Sponsor wallet has insufficient SUI balance (${(balanceMist / 1_000_000_000).toFixed(4)} SUI). Please fund the sponsor address: ${sponsorAddress}`, 400));
        }

        // 1. Reconstruct clean hash bytes from Hex
        const cleanHex = blobHash.replace('sha256-', '');
        const hashBytes = Uint8Array.from(Buffer.from(cleanHex, 'hex'));

        // 2. Build Transaction Block
        const tx = new Transaction();
        tx.setSender(senderAddress);
        tx.setGasOwner(sponsorAddress);

        // Move target call: PackageID::post::create_post
        tx.moveCall({
            target: `${PACKAGE_ID}::post::create_post`,
            arguments: [
                tx.pure.string(walrusBlobId),
                tx.pure.vector('u8', hashBytes),
                tx.pure.u8(Number(contentType || 0)),
                tx.pure.u8(Number(visibility || 0)),
                tx.pure.option('address', replyToId || null),
                tx.pure.option('address', repostOfId || null),
                tx.object(CLOCK_ID),
            ],
        });

        // 3. Build Transaction Block base64 bytes
        const txBytes = await tx.build({ client: suiClient });
        const txBytesBase64 = Buffer.from(txBytes).toString('base64');

        // 4. Generate Sponsor's Signature
        const { signature: sponsorSignature } = await sponsorKeypair.signTransaction(txBytes);

        console.log(`⛽ [Gas Station] Sponsored post transaction for ${senderAddress} built successfully!`);

        res.status(200).json({
            status: 'success',
            data: {
                txBytes: txBytesBase64,
                sponsorSignature
            }
        });

    } catch (err: any) {
        console.error('❌ [Gas Station] Failed to build sponsored transaction:', err);
        next(new AppError(err.message || 'Failed to construct sponsored transaction block.', 500));
    }
}
