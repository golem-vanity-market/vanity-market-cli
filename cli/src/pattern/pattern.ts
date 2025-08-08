import { getAddress } from "ethers";
import {
  exactlyLettersCombinationsDifficulty,
  snakeDifficulty,
  calculatePairs,
  numbersHeavyDifficulty,
  snakeCombinationsBigInt,
  exactlyLettersCombinationsBigInt,
} from "./math";
import { ProcessingUnitType } from "../params";

export type ProofCategory =
  | "user-pattern" // The address starts with the user-defined prefix.
  | "leading-any" // The number of leading characters that are the same.
  | "trailing-any" // The number of trailing characters that are the same.
  | "letters-heavy" // Addresses with a high number of letters (a-f).
  | "numbers-heavy" // Addresses with a high number of ciphers (0-9).
  | "snake-score-no-case"; // The number of repeating characters in the address. Case insensitive.

type ProofThresholds = {
  [key in ProofCategory]?: number;
};

export const CPU_PROOF_THRESHOLDS: ProofThresholds = {
  "user-pattern": 6, // At least 6 characters matching user provided pattern
  "leading-any": 6, // At least 6 leading identical characters
  "trailing-any": 6, // At least 6 trailing identical characters
  "letters-heavy": 32, // At least 32 letters (a-f)
  "numbers-heavy": 40, // At least 40 numbers (0-9)
  "snake-score-no-case": 15, // At least 15 pairs of adjacent identical characters
};

export const GPU_PROOF_THRESHOLDS: ProofThresholds = {
  "user-pattern": 8, // At least 8 characters matching user provided pattern
  "leading-any": 8, // At least 8 leading identical characters
  "trailing-any": 8, // At least 8 trailing identical characters
  "letters-heavy": 35, // At least 35 letters (a-f)
  "numbers-heavy": 35, // At least 35 numbers (0-9)
  "snake-score-no-case": 15, // At least 15 pairs of adjacent identical characters
};

export interface AddressSinglePatternScore {
  category: ProofCategory;
  score: number;
  difficulty: number;
}

export interface AddressScore {
  addressLowerCase: string;
  addressMixedCase: string;
  scores: Record<ProofCategory, AddressSinglePatternScore>;
  bestCategory: AddressSinglePatternScore;
}

export interface AddressProofResult {
  addressScore: AddressScore;
  workDone: number;
  passedCategory: ProofCategory | null;
}

export function calculateLeadingAny(
  addressStr: string,
): AddressSinglePatternScore {
  const firstChar = addressStr[0];
  let score = 0;
  for (const char of addressStr) {
    if (char !== firstChar) {
      break;
    }
    score++;
  }
  const difficulty = Math.pow(16, score);
  return { category: "leading-any", score, difficulty };
}

export function calculateTrailingAny(
  addressStr: string,
): AddressSinglePatternScore {
  const lastChar = addressStr[addressStr.length - 1];
  let score = 0;
  for (let i = addressStr.length - 1; i >= 0; i--) {
    if (addressStr[i] !== lastChar) {
      break;
    }
    score++;
  }
  const difficulty = Math.pow(16, score);
  return { category: "trailing-any", score, difficulty };
}

function calculateLettersHeavy(addressStr: string): AddressSinglePatternScore {
  const score = (addressStr.match(/[a-f]/g) || []).length;
  const difficulty = exactlyLettersCombinationsDifficulty(score, 40);
  return { category: "letters-heavy", score, difficulty };
}

function calculateNumbersHeavy(addressStr: string): AddressSinglePatternScore {
  const score = (addressStr.match(/[0-9]/g) || []).length;
  const difficulty = numbersHeavyDifficulty(score, 40);
  return { category: "numbers-heavy", score, difficulty };
}

function calculateSnakeNoCase(addressStr: string): AddressSinglePatternScore {
  const score = calculatePairs(addressStr);
  const difficulty = snakeDifficulty(score, 40);
  return { category: "snake-score-no-case", score, difficulty };
}

function calculateUserPattern(
  addressStr: string,
  userPattern: string,
): AddressSinglePatternScore {
  const patternLength = userPattern.length;
  // score == how many starting chars match
  let score = 0;
  for (let i = 0; i < patternLength; i++) {
    if (addressStr[i] === userPattern[i]) {
      score++;
    } else {
      break;
    }
  }
  const difficulty = Math.pow(16, score);
  return { category: "user-pattern", score, difficulty };
}

export function scoreSingleAddress(
  address: string,
  userPattern: string,
): AddressScore {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error("Invalid Ethereum address format");
  }

  const addressLowerCase = address.toLowerCase();
  const addressMixedCase = getAddress(addressLowerCase); // EIP-55 checksum

  const addressStr = addressLowerCase.substring(2);
  const patternStr = userPattern.toLowerCase().substring(2);

  const scoreEntries: AddressSinglePatternScore[] = [
    calculateUserPattern(addressStr, patternStr),
    calculateLeadingAny(addressStr),
    calculateTrailingAny(addressStr),
    calculateLettersHeavy(addressStr),
    calculateNumbersHeavy(addressStr),
    calculateSnakeNoCase(addressStr),
  ];

  const bestCategory = scoreEntries.reduce((a, b) =>
    a.difficulty > b.difficulty ? a : b,
  );

  return {
    addressLowerCase,
    addressMixedCase,
    scores: scoreEntries.reduce(
      (acc, entry) => {
        acc[entry.category] = entry;
        return acc;
      },
      {} as Record<ProofCategory, AddressSinglePatternScore>,
    ),
    bestCategory,
  };
}

const TOTAL_ADDRESS_SPACE = 16n ** 40n;

/**
 * Calculates the size of the "problem space" for a given category and threshold.
 * This is the number of addresses that meet or exceed the threshold.
 * NOTE: This calculation sums the spaces for each category, ignoring overlaps.
 */
export function calculateProbabilitySpace(
  category: ProofCategory,
  threshold: number,
): bigint {
  switch (category) {
    case "user-pattern": {
      // The number of addresses with at least `threshold` characters matching the user-defined pattern.
      if (threshold > 40 || threshold < 1) return 0n;
      return 16n ** BigInt(40 - threshold);
    }

    case "leading-any": {
      // The number of addresses with at least `threshold` identical leading characters.
      if (threshold > 40 || threshold < 1) return 0n;
      return 16n * 16n ** BigInt(40 - threshold);
    }

    case "trailing-any": {
      // The number of addresses with at least `threshold` identical trailing characters.
      if (threshold > 40 || threshold < 1) return 0n;
      return 16n * 16n ** BigInt(40 - threshold);
    }

    case "letters-heavy": {
      // At least `threshold` letters. We must sum combinations for k = threshold, threshold+1, ..., 40.
      let total = 0n;
      for (let k = threshold; k <= 40; k++) {
        total += exactlyLettersCombinationsBigInt(k, 40);
      }
      return total;
    }

    case "numbers-heavy": {
      // At least `threshold` numbers. This is equivalent to at most `40-threshold` letters.
      let total = 0n;
      for (let k = threshold; k <= 40; k++) {
        // An address with `k` numbers has `40-k` letters.
        total += exactlyLettersCombinationsBigInt(40 - k, 40);
      }
      return total;
    }

    case "snake-score-no-case": {
      // At least `threshold` adjacent pairs. Max pairs is 39.
      let total = 0n;
      for (let k = threshold; k <= 39; k++) {
        total += snakeCombinationsBigInt(k, 40);
      }
      return total;
    }

    default:
      throw new Error(`Unknown category: ${category}`);
  }
}

function calculateTotalProbabilitySpace(thresholds: ProofThresholds): bigint {
  let total = 0n;
  for (const [category, threshold] of Object.entries(thresholds)) {
    total += calculateProbabilitySpace(category as ProofCategory, threshold);
  }
  return total || 1n;
}

export const CPU_PROBABILITY_SPACE_SUM =
  calculateTotalProbabilitySpace(CPU_PROOF_THRESHOLDS);
export const GPU_PROBABILITY_SPACE_SUM =
  calculateTotalProbabilitySpace(GPU_PROOF_THRESHOLDS);

// How much work each "proof" represents.
export const WORK_DONE_PER_CPU_PROOF = Number(
  TOTAL_ADDRESS_SPACE / CPU_PROBABILITY_SPACE_SUM,
);
export const WORK_DONE_PER_GPU_PROOF = Number(
  TOTAL_ADDRESS_SPACE / GPU_PROBABILITY_SPACE_SUM,
);

export function checkAddressProof(
  address: string,
  userPattern: string,
  processingUnit: ProcessingUnitType,
): AddressProofResult {
  const addressScore = scoreSingleAddress(address, userPattern);
  let passedCategory: ProofCategory | null = null;

  const thresholds =
    processingUnit === ProcessingUnitType.CPU
      ? CPU_PROOF_THRESHOLDS
      : GPU_PROOF_THRESHOLDS;
  const workPerProof =
    processingUnit === ProcessingUnitType.CPU
      ? WORK_DONE_PER_CPU_PROOF
      : WORK_DONE_PER_GPU_PROOF;

  for (const category of Object.keys(thresholds) as ProofCategory[]) {
    const threshold = thresholds[category];
    if (threshold === undefined) continue;
    if (addressScore.scores[category].score >= threshold) {
      passedCategory = category;
      break;
    }
  }

  return {
    addressScore,
    workDone: passedCategory ? workPerProof : 0,
    passedCategory,
  };
}
