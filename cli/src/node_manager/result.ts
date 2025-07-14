import { ProviderInfo } from "@golem-sdk/golem-js";
import { ProcessingUnitType } from "../params";
import { AppContext } from "../app_context";

export interface VanityResult {
  address: string;
  salt: string;
  pubKey: string;
  pattern: string;
  estimatedComplexity: number;
}

export interface IterationInfo {
  jobId: string;
  provider: ProviderInfo;
  durationSeconds: number; // in seconds
  status: "success" | "error" | "not_found";
}

export interface VanityResults extends IterationInfo {
  results: VanityResult[];
  providerType: ProcessingUnitType;
}

interface ComplexityFunction {
  (pattern: string): number;
}

export function parseVanityResults(
  ctx: AppContext,
  lines: string[],
  jobId: string,
  pType: ProcessingUnitType,
  durationSeconds: number,
  pattern: string,
  complexFunc: ComplexityFunction,
  pInfo: ProviderInfo,
): VanityResults {
  const results: VanityResult[] = [];

  for (let line of lines) {
    try {
      line = line.trim();
      if (line.startsWith("0x")) {
        const r = ParseVanityResult(ctx, line, pattern, complexFunc);
        if (r == null) {
          ctx
            .L()
            .warn(
              `Invalid vanity result line from provider ${pInfo.name}:`,
              line,
            );
          continue;
        }
        results.push(r);
      }
    } catch (error) {
      console.error("Error parsing vanity result line:", line, error);
      continue;
    }
  }

  return {
    results: results,
    provider: pInfo,
    providerType: pType,
    jobId: jobId,
    durationSeconds: durationSeconds,
    status: results.length > 0 ? "success" : "not_found",
  };
}

export function ParseVanityResult(
  ctx: AppContext,
  line: string,
  keyPattern: string,
  complexFunc: ComplexityFunction,
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
  const pattern = keyPattern; // TODO recognize for which pattern this result is (results and proofs)

  return {
    address,
    salt,
    pubKey,
    pattern,
    estimatedComplexity: complexFunc(pattern),
  };
}
