import {
  binomialCoefficient,
  exactlyLettersCombinations,
  exactlyLettersCombinationsDifficulty,
  snakeDifficulty,
  totalCombinations,
} from "../pattern/math";
import {
  calculateLeadingZeroes,
  calculateLeadingAny,
  scoreSingleAddress,
  AddressPattern,
} from "../pattern/pattern";

describe("Pattern Scoring", () => {
  describe("Individual Pattern Calculations", () => {
    describe("calculateLeadingZeroes", () => {
      it("should return a high difficulty for many leading zeroes", () => {
        const addressStr = "00000000ffffffffffffffffffffffffffffffff";
        const currentNum = BigInt("0x" + addressStr);
        const { score, difficulty } = calculateLeadingZeroes(
          addressStr,
          currentNum,
        );

        expect(score).toBe(8);
        expect(difficulty).toBeGreaterThan(1e9);
      });
    });

    describe("calculateLeadingAny", () => {
      it("should return a high difficulty for a full address of the same character", () => {
        const addressStr = "ffffffffffffffffffffffffffffffffffffffff";
        const currentNum = BigInt("0x" + addressStr);
        const { score, difficulty } = calculateLeadingAny(
          addressStr,
          currentNum,
        );

        expect(score).toBe(39); // 40 chars means 39 repeats after the first
        // The difficulty should be enormous because the address is exactly ideal
        expect(difficulty).toBeGreaterThan(1e45);
      });
    });
  });

  describe("scoreSingleAddress (Orchestrator)", () => {
    it("should correctly identify 'leading-zeroes' as the best category", () => {
      const address = "0x000000000000000000000000000000000000dEaD";
      const result = scoreSingleAddress(address);

      expect(result.bestCategory).toBe("leading-zeroes");
      expect(result.totalScore).toBe(
        result.scores["leading-zeroes"].difficulty,
      );
    });

    it("should correctly identify 'letters-heavy' as the best category", () => {
      const address = "0xabcDefabcdefabcdefabcdefabcdefabcdefabcd";
      const result = scoreSingleAddress(address);
      const expectedDifficulty = exactlyLettersCombinationsDifficulty(40, 40);

      expect(result.bestCategory).toBe("letters-heavy");
      expect(result.scores["letters-heavy"].score).toBe(40);
      expect(result.totalScore).toBe(expectedDifficulty);
      expect(result.totalScore).toBeGreaterThan(1e16); // Should be very difficult
    });

    it("should correctly identify 'numbers-only' as the best category", () => {
      const address = "0x0000000000000000000000000000000000000001";
      const result = scoreSingleAddress(address);

      expect(result.bestCategory).toBe("numbers-only");
      expect(result.scores["numbers-only"].score).toBe(40);
      // Difficulty should be very high as it's a tiny number
      expect(result.scores["numbers-only"].difficulty).toBeGreaterThan(1e16);
    });

    it("should correctly identify 'snake-score-no-case' as the best category", () => {
      // This address has a high snake score but is weak in other categories
      const address = "0x2111111111111111111111111111111111111112";
      const result = scoreSingleAddress(address);

      const expectedScore = 37; // 38 '1's in a row
      const expectedDifficulty = snakeDifficulty(expectedScore, 40);

      expect(result.bestCategory).toBe("snake-score-no-case");
      expect(result.scores["snake-score-no-case"].score).toBe(expectedScore);
      expect(result.totalScore).toBe(expectedDifficulty);
    });

    it("should return a full score object with all categories", () => {
      const address = "0xffffffffffffffffffffffffffffffffffffffff";
      const result = scoreSingleAddress(address);

      const expectedCategories: AddressPattern[] = [
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
