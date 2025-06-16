import {Wallet} from "ethers";
import {readFileSync, writeFileSync} from "node:fs";

interface GenerationEntryResult {
    addr: string;
    salt: string;
    pubKey: string;
}
interface PrivateKeyEntry {
    privateKey: string;
    address: string;
}
async function reveal() {
    const pass = process.env.KEYSTORE_PASSWORD;
    if (!pass) {
        throw new Error("Keystore password is not set in environment variable: KEYSTORE_PASSWORD");
    }

    const PRIVATE_KEY_FILE = "generated.private";
    const RESULTS_FILE = "../cli/results.json";

//read from generated.private

    const privateKeyStore = readFileSync(PRIVATE_KEY_FILE).toString();
//decrypt keystore
    const wallet = await Wallet.fromEncryptedJson(privateKeyStore, pass);
    const signingKey = wallet.signingKey;

// Get uncompressed public key (starts with 0x04)
    const uncompressedPublicKey = signingKey.publicKey;
    console.log("Public uncompressed key: ", uncompressedPublicKey);

    const privateKeyNumber = BigInt(wallet.privateKey.toString().trim());

    const trimmedPublicKey = uncompressedPublicKey.replace("0x04", "0x");

    console.log("Public trimmed key: ", trimmedPublicKey);

    let results = "";
    try {
        results = readFileSync(RESULTS_FILE).toString();
    } catch (e) {
        throw new Error(`Results file not found: ${RESULTS_FILE}. Please run the generation script first.`);
    }
    const jsonResults = JSON.parse(results);
    const entries: GenerationEntryResult[] = jsonResults.entries;

    //const final: PrivateKeyEntry[] = [];

    for (const entry of entries) {
        if (entry.pubKey == trimmedPublicKey) {
            const privateKeySum = BigInt(entry.salt) + privateKeyNumber;
            const privateKeyHex = "0x" + privateKeySum.toString(16).padStart(64, '0');
            const newWallet = new Wallet(privateKeyHex);

            console.log("Found matching entry:");
            console.log(`Private-secret, Address: ${entry.addr}`);

            writeFileSync(`keys/${entry.addr}.keystore.json`, JSON.stringify(JSON.parse(await newWallet.encrypt(pass)), null, 2).toLowerCase());
        }
    }
}

reveal()
    .then(() => console.log("Reveal completed successfully"));
