import {Wallet, ethers} from "ethers";
import {writeFileSync} from "node:fs";
import {Buffer} from "node:buffer"

async function generateKeystore() {
  const pass = process.env.KEYSTORE_PASSWORD;
  if (!pass) {
    throw new Error("Keystore password is not set in environment variable: KEYSTORE_PASSWORD");
  }
  if (pass.length < 10) {
    throw new Error("Keystore password must be at least 10 characters long");
  }
  if (!pass.match(/[a-z]/) || !pass.match(/[A-Z]/) || !pass.match(/[0-9]/)) {
    throw new Error("Keystore password must contain at least one lowercase letter, one uppercase letter, and one number");
  }

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
  console.log("Private Key:            ", "0x...");
  console.log("Uncompressed Public Key:", uncompressedPublicKey);
  console.log("Address:                ", wallet.address);
  const keystoreJson = await wallet.encrypt(pass);

  writeFileSync("generated.private", JSON.stringify(JSON.parse(keystoreJson), null, 2).toLowerCase());
  writeFileSync("../generated.pub", uncompressedPublicKey);
}

generateKeystore()
  .then(() => console.log("Keystore generated successfully"))
