import { execSync, SpawnSyncReturns } from "child_process";
import { join } from "path";
import { writeFileSync, unlinkSync } from "fs";
import { validateGenerateOptions, readPublicKeyFromFile } from "../index";

describe("Vanity Address Generator CLI - Step 2", () => {
  const cliPath = join(__dirname, "../../dist/index.js");

  beforeAll(() => {
    // Build the project before running integration tests
    try {
      execSync("npm run build", { stdio: "inherit" });
    } catch (error: unknown) {
      console.error("Failed to build project for testing:", error);
      throw error;
    }
  });

  describe("CLI Basic Functionality", () => {
    it("should display help when no arguments are provided", () => {
      const result = execSync(`node ${cliPath} --help`, { encoding: "utf8" });
      expect(result).toContain("Usage:");
      expect(result).toContain("golem-addr");
      expect(result).toContain("Vanity address generator CLI");
    });

    it("should display correct version information", () => {
      const result = execSync(`node ${cliPath} --version`, {
        encoding: "utf8",
      });
      const lines = result.trim().split("\n");
      const versionLine = lines[lines.length - 1]; // Get last line which should be version
      expect(versionLine).toMatch(/^\d+\.\d+\.\d+$/);
      expect(versionLine).toBe("1.0.0");
    });
  });

  describe("Generate Command - Step 2", () => {
    const validPublicKeyPath = join(__dirname, "test-public-key.txt");
    const invalidPublicKeyPath = join(__dirname, "test-invalid-key.txt");
    const emptyPublicKeyPath = join(__dirname, "test-empty-key.txt");

    beforeAll(() => {
      // Create test public key files
      writeFileSync(
        validPublicKeyPath,
        "0x04d4a96d675423cc05f60409c48b084a53d3fa0ac59957939f526505c43f975b77fabab74decd66d80396308db9cb4db13b0c273811d51a1773d6d9e2dbcac1d28",
      );
      writeFileSync(invalidPublicKeyPath, "invalid-key");
      writeFileSync(emptyPublicKeyPath, "");
    });

    afterAll(() => {
      // Clean up test files
      try {
        unlinkSync(validPublicKeyPath);
        unlinkSync(invalidPublicKeyPath);
        unlinkSync(emptyPublicKeyPath);
      } catch (_error: unknown) {
        // Ignore cleanup errors
      }
    });

    it("should display generate command help", () => {
      const result = execSync(`node ${cliPath} generate --help`, {
        encoding: "utf8",
      });
      expect(result).toContain("generate");
      expect(result).toContain("public-key");
      expect(result).toContain("vanity-address-prefix");
      expect(result).toContain("budget-glm");
      expect(result).toContain("Path to file containing the public key");
    });

    it("should require all mandatory arguments for generate command", () => {
      try {
        execSync(`node ${cliPath} generate`, { encoding: "utf8" });
        fail("Should have thrown an error for missing arguments");
      } catch (e: unknown) {
        const error = e as SpawnSyncReturns<string>;
        expect(error.stderr || error.stdout).toContain("required");
      }
    });

    it("should validate public key file exists", () => {
      try {
        execSync(
          `node ${cliPath} generate --public-key /nonexistent/file.txt --vanity-address-prefix test --budget-glm 100`,
          { encoding: "utf8" },
        );
        fail("Should have thrown an error for nonexistent file");
      } catch (e: unknown) {
        const error = e as SpawnSyncReturns<string>;
        expect(error.stderr || error.stdout).toContain(
          "Public key file not found",
        );
      }
    });

    it("should validate public key format from file", () => {
      try {
        execSync(
          `node ${cliPath} generate --public-key ${invalidPublicKeyPath} --vanity-address-prefix test --budget-glm 100`,
          { encoding: "utf8" },
        );
        fail("Should have thrown an error for invalid public key");
      } catch (e: unknown) {
        const error = e as SpawnSyncReturns<string>;
        expect(error.stderr || error.stdout).toContain(
          "Invalid public key format",
        );
      }
    });

    it("should validate budget-glm is a positive number", () => {
      try {
        execSync(
          `node ${cliPath} generate --public-key ${validPublicKeyPath} --vanity-address-prefix test --budget-glm -50`,
          { encoding: "utf8" },
        );
        fail("Should have thrown an error for negative budget");
      } catch (e: unknown) {
        const error = e as SpawnSyncReturns<string>;
        expect(error.stderr || error.stdout).toContain(
          "Budget must be a positive number",
        );
      }
    });

    // todo : fix the test with mockup?
    /*it("should execute generate command with valid arguments", () => {
      const result = execSync(
        `node ${cliPath} generate --public-key ${validPublicKeyPath} --vanity-address-prefix test --budget-glm 100`,
        { encoding: "utf8" },
      );
      expect(result).toContain("Starting vanity address generation");
      expect(result).toContain("Public Key File:");
      expect(result).toContain(
        "Public Key: 0x04d4a96d675423cc05f60409c48b084a53d3fa0ac59957939f526505c43f975b77fabab74decd66d80396308db9cb4db13b0c273811d51a1773d6d9e2dbcac1d28",
      );
      expect(result).toContain("Vanity Address Prefix: test");
      expect(result).toContain("Budget (GLM): 100");
    });*/
  });
});

describe("Unit Tests for Generate Command Functions", () => {
  const testPublicKeyPath = join(__dirname, "unit-test-public-key.txt");
  const testInvalidKeyPath = join(__dirname, "unit-test-invalid-key.txt");
  const testEmptyKeyPath = join(__dirname, "unit-test-empty-key.txt");

  beforeAll(() => {
    // Create test files for unit tests
    writeFileSync(
      testPublicKeyPath,
      "0x04d4a96d675423cc05f60409c48b084a53d3fa0ac59957939f526505c43f975b77fabab74decd66d80396308db9cb4db13b0c273811d51a1773d6d9e2dbcac1d28",
    );
    writeFileSync(testInvalidKeyPath, "invalid-key-format");
    writeFileSync(testEmptyKeyPath, "");
  });

  afterAll(() => {
    // Clean up test files
    try {
      unlinkSync(testPublicKeyPath);
      unlinkSync(testInvalidKeyPath);
      unlinkSync(testEmptyKeyPath);
    } catch (_error: unknown) {
      // Ignore cleanup errors
    }
  });

  describe("readPublicKeyFromFile", () => {
    it("should read valid public key from file", () => {
      const publicKey = readPublicKeyFromFile(testPublicKeyPath);
      expect(publicKey).toBe(
        "0x04d4a96d675423cc05f60409c48b084a53d3fa0ac59957939f526505c43f975b77fabab74decd66d80396308db9cb4db13b0c273811d51a1773d6d9e2dbcac1d28",
      );
    });

    it("should throw error for nonexistent file", () => {
      expect(() => readPublicKeyFromFile("/nonexistent/file.txt")).toThrow(
        "Public key file not found",
      );
    });

    it("should throw error for empty file", () => {
      expect(() => readPublicKeyFromFile(testEmptyKeyPath)).toThrow(
        "Public key file is empty",
      );
    });
  });

  describe("validateGenerateOptions", () => {
    it("should validate correct options successfully", () => {
      const validOptions = {
        publicKey:
          "0x04d4a96d675423cc05f60409c48b084a53d3fa0ac59957939f526505c43f975b77fabab74decd66d80396308db9cb4db13b0c273811d51a1773d6d9e2dbcac1d28",
        vanityAddressPrefix: "test",
        budgetGlm: 100,
      };

      expect(() => validateGenerateOptions(validOptions)).not.toThrow();
    });

    it("should throw error for missing public key", () => {
      const invalidOptions = {
        vanityAddressPrefix: "test",
        budgetGlm: 100,
      };

      expect(() => validateGenerateOptions(invalidOptions)).toThrow(
        "Public key is required",
      );
    });

    it("should throw error for invalid public key format", () => {
      const invalidOptions = {
        publicKey: "invalid-key",
        vanityAddressPrefix: "test",
        budgetGlm: 100,
      };

      expect(() => validateGenerateOptions(invalidOptions)).toThrow(
        "Invalid public key format",
      );
    });

    it("should throw error for missing vanity address prefix", () => {
      const invalidOptions = {
        publicKey:
          "0x04d4a96d675423cc05f60409c48b084a53d3fa0ac59957939f526505c43f975b77fabab74decd66d80396308db9cb4db13b0c273811d51a1773d6d9e2dbcac1d28",
        budgetGlm: 100,
      };

      expect(() => validateGenerateOptions(invalidOptions)).toThrow(
        "Vanity address prefix is required",
      );
    });

    it("should throw error for empty vanity address prefix", () => {
      const invalidOptions = {
        publicKey:
          "0x04d4a96d675423cc05f60409c48b084a53d3fa0ac59957939f526505c43f975b77fabab74decd66d80396308db9cb4db13b0c273811d51a1773d6d9e2dbcac1d28",
        vanityAddressPrefix: "",
        budgetGlm: 100,
      };

      expect(() => validateGenerateOptions(invalidOptions)).toThrow(
        "Vanity address prefix cannot be empty",
      );
    });

    it("should throw error for vanity address prefix that is too long", () => {
      const invalidOptions = {
        publicKey:
          "0x04d4a96d675423cc05f60409c48b084a53d3fa0ac59957939f526505c43f975b77fabab74decd66d80396308db9cb4db13b0c273811d51a1773d6d9e2dbcac1d28",
        vanityAddressPrefix: "a".repeat(9), // Maximum is 8 characters
        budgetGlm: 100,
      };

      expect(() => validateGenerateOptions(invalidOptions)).toThrow(
        "Vanity address prefix too long",
      );
    });

    it("should throw error for invalid budget", () => {
      const invalidOptions = {
        publicKey:
          "0x04d4a96d675423cc05f60409c48b084a53d3fa0ac59957939f526505c43f975b77fabab74decd66d80396308db9cb4db13b0c273811d51a1773d6d9e2dbcac1d28",
        vanityAddressPrefix: "test",
        budgetGlm: -1,
      };

      expect(() => validateGenerateOptions(invalidOptions)).toThrow(
        "Budget must be a positive number",
      );
    });

    it("should throw error for budget exceeding maximum", () => {
      const invalidOptions = {
        publicKey:
          "0x04d4a96d675423cc05f60409c48b084a53d3fa0ac59957939f526505c43f975b77fabab74decd66d80396308db9cb4db13b0c273811d51a1773d6d9e2dbcac1d28",
        vanityAddressPrefix: "test",
        budgetGlm: 1001, // Maximum is 1000
      };

      expect(() => validateGenerateOptions(invalidOptions)).toThrow(
        "Budget exceeds maximum allowed",
      );
    });
  });
});
