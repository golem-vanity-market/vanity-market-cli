import { getAddress } from "ethers";
import {
  exactlyLettersCombinationsDifficulty,
  totalCombinations,
  snakeDifficulty,
  calculatePairs,
  absDiff,
} from "./math";

export type ProofCategory =
  | "leading-zeroes" // The number of leading zeroes in the address.
  | "leading-any" // The number of leading characters that are the same.
  | "letters-heavy" // The number of letters in the address (ciphers can be different).
  | "numbers-only" // Only ciphers, score determined by smallest decimal.
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

const MAX_U256_HEX = "ffffffffffffffffffffffffffffffffffffffff";
const MAX_U256_BIGINT = BigInt("0x" + MAX_U256_HEX);

export function calculateLeadingZeroes(
  addressStr: string,
  currentNum: bigint,
): AddressSinglePatternScore {
  let score = 0;
  for (let i = 0; i < addressStr.length; i++) {
    if (addressStr[i] !== "0") {
      break;
    }
    score++;
  }
  const difficulty = Number(MAX_U256_BIGINT) / Number(currentNum + 1n);
  return { category: "leading-zeroes", score, difficulty };
}

export function calculateLeadingAny(
  addressStr: string,
  currentNum: bigint,
): AddressSinglePatternScore {
  const firstChar = addressStr[0];
  let score = 0;
  for (let i = 1; i < addressStr.length; i++) {
    if (addressStr[i] !== firstChar) {
      break;
    }
    score++;
  }

  let minAnyDifference = MAX_U256_BIGINT;
  for (const char of "0123456789abcdef") {
    const idealNum = BigInt("0x" + char.repeat(40));
    const difference = absDiff(idealNum, currentNum);
    if (difference < minAnyDifference) {
      minAnyDifference = difference;
    }
  }
  const difficulty =
    Number(MAX_U256_BIGINT / 2n) / Number(minAnyDifference + 1n) / 15.0;

  return { category: "leading-any", score, difficulty };
}

function calculateLettersHeavy(addressStr: string): AddressSinglePatternScore {
  const score = (addressStr.match(/[a-f]/g) || []).length;
  const difficulty = exactlyLettersCombinationsDifficulty(score, 40);
  return { category: "letters-heavy", score, difficulty };
}

function calculateNumbersOnly(addressStr: string): AddressSinglePatternScore {
  const score = (addressStr.match(/[0-9]/g) || []).length;
  let difficulty = 1.0;

  if (score === 40) {
    const number = parseFloat(addressStr);
    const maxNumber = 1e40 - 1;
    const difficulty1 = totalCombinations(40) / 10 ** 40 / (number / maxNumber);
    const difficulty2 =
      totalCombinations(40) / 10 ** 40 / ((maxNumber - number) / maxNumber);
    difficulty = Math.max(difficulty1, difficulty2);
  }

  return { category: "numbers-only", score, difficulty };
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
  const currentNum = BigInt("0x" + addressStr);

  const scoreEntries: AddressSinglePatternScore[] = [
    calculateLeadingZeroes(addressStr, currentNum),
    calculateLeadingAny(addressStr, currentNum),
    calculateLettersHeavy(addressStr),
    calculateNumbersOnly(addressStr),
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
