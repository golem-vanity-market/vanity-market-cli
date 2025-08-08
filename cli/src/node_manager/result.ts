import { ProviderInfo } from "@golem-sdk/golem-js";
import { ProcessingUnitType } from "../params";
import { AppContext } from "../app_context";
import { AddressProofResult, checkAddressProof } from "../pattern/pattern";

export type CommandStatus = "success" | "not_found" | "stopped";

export type VanityResult = {
  address: string;
  salt: string;
  pubKey: string;
  pattern: string;
  isUserPattern: boolean;
  proof: AddressProofResult;
};

export interface IterationInfo {
  agreementId: string;
  provider: ProviderInfo;
  providerType: ProcessingUnitType;
  durationSeconds: number; // in seconds
  status: CommandStatus;
}

export interface CommandResult extends IterationInfo {
  results: VanityResult[];
  failedLines: string[];
}

export interface ParsedResults {
  results: VanityResult[];
  failedLines: string[];
}

export function parseVanityResults(
  ctx: AppContext,
  lines: string[],
  pattern: string,
  processingUnit: ProcessingUnitType,
): ParsedResults {
  const results: VanityResult[] = [];
  const failedLines: string[] = [];

  for (let line of lines) {
    try {
      line = line.trim();
      if (line.startsWith("0x")) {
        const r = parseVanityResult(line, pattern, processingUnit);
        if (r == null) {
          ctx.L().warn(`Invalid vanity result line from provider:`, line);
          failedLines.push(line);
          continue;
        }
        results.push(r);
      }
    } catch (error) {
      console.error("Error parsing vanity result line:", line, error);
      failedLines.push(line);
      continue;
    }
  }
  //TODO reputation
  //add info about non matching lines
  return { results, failedLines };
}

export function parseVanityResult(
  line: string,
  keyPattern: string,
  processingUnit: ProcessingUnitType,
): VanityResult | null {
  const trimmedLine = line.trim();
  if (!trimmedLine.startsWith("0x")) {
    return null;
  }

  const parts = trimmedLine.split(",");
  if (parts.length < 3) {
    return null;
  }

  const salt = parts[0].trim();
  const address = parts[1].trim();
  const pubKey = parts[2].trim();
  return {
    address,
    salt,
    pubKey,
    isUserPattern: address.toLowerCase().startsWith(keyPattern.toLowerCase()),
    pattern: keyPattern,
    proof: checkAddressProof(address, keyPattern.toLowerCase(), processingUnit),
  };
}
