import { Wallet } from "ethers";

// Generate random, strong password
console.log(Wallet.createRandom().address.slice(2, 26));
