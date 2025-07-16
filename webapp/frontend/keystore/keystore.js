const ALLOWED_PARENT_ORIGINS = [
  "https://vanity.market",
  "http://localhost:3000"         // For local development
];
const LOCAL_STORAGE_KEY = "vanity_market_master_keystore_json";

window.addEventListener("message", async (event) => {
  if (!ALLOWED_PARENT_ORIGINS.includes(event.origin)) {
    return;
  }

  const { action, payload, messageId } = event.data;
  const postReply = (status, data) => {
    event.source.postMessage({ status, payload: data, messageId }, event.origin);
  };

  try {
    switch (action) {

      case "checkForExistingKey": {
        const storedJson = localStorage.getItem(LOCAL_STORAGE_KEY);
        postReply("success", { keyExists: !!storedJson });
        break;
      }

      case "unlockAndGetPublicKey": {
        const { passphrase } = payload;
        if (!passphrase) {
            throw new Error("Passphrase is required to unlock the key.");
        }
        
        const encryptedJson = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!encryptedJson) {
          throw new Error("No master key found in this browser's storage.");
        }

        const masterWallet = ethers.Wallet.fromEncryptedJsonSync(encryptedJson, passphrase);
        
        postReply("success", {
            publicKey: masterWallet.signingKey.publicKey,
        });
        break;
      }


      case "generateInitialKey": {
        const { passphrase } = payload;
        if (!passphrase || passphrase.length < 12) {
          throw new Error("A strong passphrase of at least 12 characters is required.");
        }
        
        // Generate a random wallet
        const masterWallet = ethers.Wallet.createRandom();
        const encryptedJson = await masterWallet.encrypt(passphrase);
        localStorage.setItem(LOCAL_STORAGE_KEY, encryptedJson);
        
        postReply("success", {
          publicKey: masterWallet.signingKey.publicKey,
        });
        break;
      }
      
      case "deriveAndDownload": {
        const { salt, passphrase, downloadPassword } = payload;
        if (!salt || !passphrase || !downloadPassword) {
            throw new Error("Salt, original passphrase, and a new download password are all required.");
        }
        const encryptedJson = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!encryptedJson) {
            throw new Error("No master key found in this browser's storage. Please generate one first.");
        }
        let masterWallet;
        try {
            masterWallet = ethers.Wallet.fromEncryptedJsonSync(encryptedJson, passphrase);
        } catch {
            throw new Error("Invalid passphrase for the stored master key.");
        }

        const privateKeyNumber = BigInt(masterWallet.privateKey.toString().trim());
        const privateKeySum = BigInt(salt) + privateKeyNumber;
        const privateKeyHex = "0x" + privateKeySum.toString(16).padStart(64, '0');
        const vanityWallet = new ethers.Wallet(privateKeyHex);
        const finalEncryptedJson = await vanityWallet.encrypt(downloadPassword);

        // trigger download
        const blob = new Blob([finalEncryptedJson], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.getElementById("downloadAnchor");
        
        a.href = url;
        a.download = `${new Date().toISOString().replace(/:/g, '-')}--${vanityWallet.address}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        postReply("success");
        break;
      }

      default:
        postReply("error", { message: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error("Keystore Iframe Error:", error);
    postReply("error", { message: error.message });
  }
});