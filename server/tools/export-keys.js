const fs = require('fs');
const path = require('path');

const importDynamic = new Function('modulePath', 'return import(modulePath)');

async function run() {
    try {
        const keypairsMod = await importDynamic('@mysten/sui/keypairs/ed25519');
        const Ed25519Keypair = keypairsMod.Ed25519Keypair;
        
        console.log("==================================================================================");
        console.log("BlobCast Walrus Sub-Wallets Key Export Tool");
        console.log("==================================================================================");
        
        const dir = __dirname;
        for (let i = 0; i < 8; i++) {
            const keystorePath = path.join(dir, `sui_${i}.keystore`);
            if (!fs.existsSync(keystorePath)) continue;
            
            const keystoreContent = JSON.parse(fs.readFileSync(keystorePath, 'utf8'));
            const base64Key = keystoreContent[0];
            
            const rawBytes = Buffer.from(base64Key, 'base64');
            // Sui signature scheme: Byte 0 is signature flag (0 for ed25519), remaining 32 bytes are seed
            const seed = new Uint8Array(rawBytes.subarray(1));
            
            const keypair = Ed25519Keypair.fromSecretKey(seed);
            const address = keypair.getPublicKey().toSuiAddress();
            
            const hexSeed = rawBytes.subarray(1).toString('hex');
            const bech32Key = keypair.getSecretKey();
            
            console.log(`\n📬 WALLET #${i}`);
            console.log(`Address:     ${address}`);
            console.log(`Hex Key:     0x${hexSeed}`);
            console.log(`Bech32 Key:  ${bech32Key}`);
        }
        console.log("\n==================================================================================");
        console.log("💡 You can import any of these private keys into Sui Wallet, Surf Wallet, or OKX.");
        console.log("💡 Simply select \"Import Private Key\" and copy-paste either the Hex Key or the Bech32 Key.");
        console.log("==================================================================================");
    } catch (e) {
        console.error("Error exporting keys:", e);
    }
}

run();
