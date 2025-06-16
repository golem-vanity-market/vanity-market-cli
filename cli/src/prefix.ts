import { getBytes, hexlify } from "ethers";

export class GenerationPrefix {
  val: Uint8Array<ArrayBufferLike>;
  original: string;

  constructor(prefix: string) {
    const byt = getBytes(prefix.slice(0, 10));
    if (byt.length !== 4) {
      throw new Error("Prefix must be exactly 8 bytes long");
    }
    this.val = byt;
    this.original = prefix;
  }

  fullPrefix(): string {
    return this.original;
  }

  toHex(): string {
    return hexlify(this.val);
  }

  toArg(): string {
    return BigInt(hexlify(this.val.slice().reverse())).toString(10);
  }
}
