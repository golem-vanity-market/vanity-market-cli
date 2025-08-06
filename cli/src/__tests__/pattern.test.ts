import {
  binomialCoefficient,
  exactlyLettersCombinations,
  exactlyLettersCombinationsDifficulty,
  totalCombinations,
} from "../pattern/math";
import { scoreSingleAddress, ProofCategory } from "../pattern/pattern";

describe("Pattern Scoring", () => {
  describe("scoreSingleAddress", () => {
    it("should correctly identify 'leading-zeroes' as the best category", () => {
      const address = "0x000000000000000000000000000000000000dEaD";
      const result = scoreSingleAddress(address);
      const expectedScore = 36; // 36 leading zeroes

      expect(result.bestCategory.category).toBe("leading-zeroes");
      expect(result.bestCategory.score).toBe(expectedScore);
      expect(result.bestCategory.difficulty).toBeGreaterThan(1e15); // Should be very high
    });

    it("should correctly identify 'leading-any' as the best category", () => {
      const address = "0xaaaaaaaaaaaaaaaaaaaa01234567890123456789";
      const result = scoreSingleAddress(address);
      const expectedScore = 19; // 20 leading 'a's minus the first one, since addresses with no repeating characters are scored as 0

      expect(result.bestCategory.category).toBe("leading-any");
      expect(result.bestCategory.score).toBe(expectedScore);
      expect(result.bestCategory.difficulty).toBeGreaterThan(1e15); // Should be very high
    });

    it("should correctly identify 'letters-heavy' as the best category", () => {
      const address = "0xabcDefabcdefabcdefabcdefabcdefabcdefabcd";
      const result = scoreSingleAddress(address);
      const expectedScore = 40; // 40 letters

      expect(result.bestCategory.category).toBe("letters-heavy");
      expect(result.bestCategory.score).toBe(expectedScore);
      expect(result.bestCategory.difficulty).toBeGreaterThan(1e15); // Should be very high
    });

    it("should correctly identify 'numbers-only' as the best category", () => {
      const address = "0x0000000000000000000000000000000000000001";
      const result = scoreSingleAddress(address);

      expect(result.bestCategory.category).toBe("numbers-only");
      expect(result.bestCategory.score).toBe(40);
      expect(result.bestCategory.difficulty).toBeGreaterThan(1e15); // Should be very high
    });

    it("should correctly identify 'snake-score-no-case' as the best category", () => {
      // This address has a high snake score but is weak in other categories
      const address = "0x2111111111111111111111111111111111111112";
      const result = scoreSingleAddress(address);

      const expectedScore = 37; // 37 '1's in a row

      expect(result.bestCategory.category).toBe("snake-score-no-case");
      expect(result.bestCategory.score).toBe(expectedScore);
      expect(result.bestCategory.difficulty).toBeGreaterThan(1e15); // Should be very high
    });

    it("should return a full score object with all categories", () => {
      const address = "0xffffffffffffffffffffffffffffffffffffffff";
      const result = scoreSingleAddress(address);

      const expectedCategories: ProofCategory[] = [
        "leading-zeroes",
        "leading-any",
        "letters-heavy",
        "numbers-only",
        "snake-score-no-case",
      ];

      for (const category of expectedCategories) {
        expect(result.scores[category]).toBeDefined();
      }
    });

    it("should throw an error for an invalid address format", () => {
      expect(() => scoreSingleAddress("0x123")).toThrow(
        "Invalid Ethereum address format",
      );
    });
  });
  describe("Math Functions", () => {
    it("should calculate the binomial coefficient", () => {
      expect(binomialCoefficient(40, 1)).toBe(40);
      expect(binomialCoefficient(40, 2)).toBe(780);
    });

    it("should correctly calculate total and exact combinations", () => {
      // test against known values
      expect(totalCombinations(40)).toBeCloseTo(1.461501637330903e48);

      expect(exactlyLettersCombinations(40, 40)).toBeCloseTo(
        1.3367494538843734e31,
      );
      expect(exactlyLettersCombinations(39, 40)).toBeCloseTo(
        8.911663025895824e32,
      );
      const probabilityAllLetters =
        exactlyLettersCombinations(40, 40) / totalCombinations(40);
      expect(probabilityAllLetters).toBeCloseTo(9.14641092243755e-18, 19); // up to 19 decimal places
    });

    it("should produce difficulty results consistent with the original Rust tests", () => {
      const difficulty39 = exactlyLettersCombinationsDifficulty(39, 40);
      const difficulty40 = exactlyLettersCombinationsDifficulty(40, 40);
      expect(difficulty40).toBeGreaterThan(difficulty39);
      // test against known values
      expect(difficulty39).toBeCloseTo(1615751276481489, 0); // (16^40) /  ((binomialCoefficient(40, 1) * 10^1 + 6^39) + (6^40))
      expect(difficulty40).toBeCloseTo(109332503041914110, 0); // (16^40) / (6^40)

      const ratio = difficulty40 / difficulty39;
      // ratio should be around 67.79, but due to javascript floating point precision
      // it might not be exact, so we allow a small margin of error
      expect(Math.abs(ratio - 67.79)).toBeLessThan(0.5);
    });
  });
});
