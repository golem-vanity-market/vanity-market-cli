import { Wallet, ethers } from "ethers";

// Generate random 32-byte private key
const privateKeyBytes = ethers.randomBytes(32);
const privateKey = "0x" + Buffer.from(privateKeyBytes).toString("hex");

// Create Wallet from private key
const wallet = new Wallet(privateKey);

// Get SigningKey from wallet
const signingKey = wallet.signingKey;

// Get uncompressed public key (starts with 0x04)
const uncompressedPublicKey = signingKey.publicKey;

// Output everything
console.log("Private Key:            ", wallet.privateKey);
console.log("Uncompressed Public Key:", uncompressedPublicKey);
console.log("Address:                ", wallet.address);
