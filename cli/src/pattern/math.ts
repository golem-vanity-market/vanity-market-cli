/* Calculates n choose k (binomial coefficient). */
export function binomialCoefficient(n: number, k: number) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let res = 1;
  for (let i = 1; i <= k; i++) {
    res *= n - i + 1;
    res /= i;
  }
  return res;
}

/** Total possible combinations for a hex string of length n. */
export function totalCombinations(n: number): number {
  return 16.0 ** n;
}

/** Calculates combinations for an address with an exact number of letters. */
export function exactlyLettersCombinations(
  letters: number,
  total: number,
): number {
  if (letters < 0 || letters > total) return 0;
  // 6 choices for letters, 10 for numbers.
  return (
    6.0 ** letters * // each letter can be one of 6 (a-f)
    binomialCoefficient(total, letters) * // choose positions for letters
    10.0 ** (total - letters) // remaining positions can be any digit (0-9)
  );
}

/** Calculates the difficulty of finding an address with at least a certain number of letters. */
export function exactlyLettersCombinationsDifficulty(
  letters: number,
  total: number,
): number {
  if (letters < 30) return 1.0; // Below this threshold, it's not considered difficult.

  let qualifyingCombinations = 0.0;
  for (let i = letters; i <= total; i++) {
    qualifyingCombinations += exactlyLettersCombinations(i, total);
  }

  if (qualifyingCombinations === 0) return totalCombinations(total);
  return totalCombinations(total) / qualifyingCombinations;
}
/** Calculates combinations for a "snake" (number of adjacent identical characters). */
function snakeCombinations(pairs: number, total: number): number {
  if (pairs < 0 || pairs >= total) return 0.0;

  // Number of ways to place 'pairs' pairs among (total-1) possible adjacent positions
  const pairPositions = binomialCoefficient(total - 1, pairs);

  // The number of groups is (total - pairs)
  // First group: 16 choices (any hex digit)
  // Each subsequent group: 15 choices (not equal to previous group)
  const firstCharChoices = 16.0;
  const nextCharChoices = 15.0 ** (total - 1 - pairs);

  // Total combinations is product of choices and arrangements
  return firstCharChoices * nextCharChoices * pairPositions;
}

/** Calculates difficulty of finding an address with at least a certain "snake" score. */
export function snakeDifficulty(pairs: number, total: number): number {
  if (pairs < 0) return 0.0;

  // Number of possible addresses with _at least_ 'pairs' adjacent identical characters
  let qualifyingCombinations = 0.0;
  for (let i = pairs; i < total; i++) {
    qualifyingCombinations += snakeCombinations(i, total);
  }
  if (qualifyingCombinations === 0) return totalCombinations(total); // avoid division by zero
  return totalCombinations(total) / qualifyingCombinations;
}

/** Calculates pairs of adjacent identical characters in a string. */
export function calculatePairs(s: string) {
  const lowerS = s.toLowerCase();
  if (lowerS.length < 2) return 0;
  let pairs = 0;
  for (let i = 1; i < lowerS.length; i++) {
    if (lowerS[i] === lowerS[i - 1]) pairs++;
  }
  return pairs;
}

/** Calculates the absolute difference between two bigints. */
export function absDiff(a: bigint, b: bigint): bigint {
  return a > b ? a - b : b - a;
}
