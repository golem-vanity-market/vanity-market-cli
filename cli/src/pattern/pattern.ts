import { getAddress } from "ethers";
import {
  exactlyLettersCombinationsDifficulty,
  snakeDifficulty,
  calculatePairs,
  numbersHeavyDifficulty,
} from "./math";

export type ProofCategory =
  | "leading-any" // The number of leading characters that are the same.
  | "letters-heavy" // Addresses with a high number of letters (a-f).
  | "numbers-heavy" // Addresses with a high number of ciphers (0-9).
  | "snake-score-no-case"; // The number of repeating characters in the address. Case insensitive.

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

export function scoreSingleAddress(address: string): AddressScore {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error("Invalid Ethereum address format");
  }

  const addressLowerCase = address.toLowerCase();
  const addressMixedCase = getAddress(addressLowerCase); // EIP-55 checksum

  const addressStr = addressLowerCase.substring(2);

  const scoreEntries: AddressSinglePatternScore[] = [
    calculateLeadingAny(addressStr),
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
