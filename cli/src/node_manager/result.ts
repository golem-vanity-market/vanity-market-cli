import { ProviderInfo } from "@golem-sdk/golem-js";
import { ProcessingUnitType } from "../params";
import { AppContext } from "../app_context";
import { checkAddressProof, MatchingProblems } from "../pattern/pattern";
import { Problem } from "../lib/db/schema";

export type CommandStatus = "success" | "not_found" | "stopped";

export type VanityResult = {
  address: string;
  salt: string | null;
  pubKey: string | null;
  matchingProblems: MatchingProblems;
  workDone: number;
  path: string | null;
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
  problems: Problem[],
  processingUnit: ProcessingUnitType,
): ParsedResults {
  const results: VanityResult[] = [];
  const failedLines: string[] = [];

  for (let line of lines) {
    try {
      line = line.trim();
      if (line.startsWith("Matched address:")) {
        const r = parseVanityPathResult(line, problems, processingUnit);
        if (r == null) {
          ctx.L().warn(`Invalid vanity result line from provider:`, line);
          failedLines.push(line);
          continue;
        }
        ctx.L().info(`Parsed vanity result: ${r.address}`);
        results.push(r);
      }
      if (line.startsWith("0x")) {
        const r = parseVanityResult(line, problems, processingUnit);
        if (r == null) {
          ctx.L().warn(`Invalid vanity result line from provider:`, line);
          failedLines.push(line);
          continue;
        }
        ctx.L().info(`Parsed vanity result: ${r.address}`);
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

export function parseVanityPathResult(
  line: string,
  problems: Problem[],
  processingUnit: ProcessingUnitType,
): VanityResult | null {
  const trimmedLine = line.trim();
  if (!trimmedLine.startsWith("Matched address:")) {
    return null;
  }

  const parts = trimmedLine.split(",");
  if (parts.length < 2) {
    return null;
  }

  const address = parts[0].replace("Matched address:", "").trim();
  const path = parts[1].replace("path:", "").trim();

  const { matchingProblems, workDone } = checkAddressProof(
    address,
    problems,
    processingUnit,
  );

  return {
    salt: null,
    pubKey: null,
    address,
    path,
    matchingProblems,
    workDone,
  };
}

export function parseVanityResult(
  line: string,
  problems: Problem[],
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

  const { matchingProblems, workDone } = checkAddressProof(
    address,
    problems,
    processingUnit,
  );
  return {
    path: null,
    address,
    salt,
    pubKey,
    matchingProblems,
    workDone,
  };
}
