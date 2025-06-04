import { execSync } from 'child_process';
import { join } from 'path';
import { writeFileSync, unlinkSync } from 'fs';
import { main, initializeOpenTelemetry, getPackageVersion, validateGenerateOptions, readPublicKeyFromFile } from '../index';

describe('Vanity Address Generator CLI - Step 2', () => {
  const cliPath = join(__dirname, '../../dist/index.js');

  beforeAll(() => {
    // Build the project before running integration tests
    try {
      execSync('npm run build', { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to build project for testing:', error);
      throw error;
    }
  });

  describe('CLI Basic Functionality', () => {
    it('should display help when no arguments are provided', () => {
      try {
        const result = execSync(`node ${cliPath} --help`, { encoding: 'utf8' });
        expect(result).toContain('Usage:');
        expect(result).toContain('golem-addr');
        expect(result).toContain('Vanity address generator CLI');
      } catch (error: any) {
        // Commander exits with code 1 for help, but outputs help text to stdout
        expect(error.stdout).toContain('Usage:');
        expect(error.stdout).toContain('golem-addr');
      }
    });

    it('should display correct version information', () => {
      try {
        const result = execSync(`node ${cliPath} --version`, { encoding: 'utf8' });
        expect(result.trim()).toMatch(/^\d+\.\d+\.\d+$/);
        expect(result.trim()).toBe('1.0.0');
      } catch (error: any) {
        expect(error.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
      }
    });

    it('should execute hello command successfully', () => {
      const result = execSync(`node ${cliPath} hello`, { encoding: 'utf8' });
      expect(result).toContain('Hello World from Golem Address Generator!');
      expect(result).toContain('Commander.js is working');
      expect(result).toContain('OpenTelemetry is configured');
    });
  });

  describe('Generate Command - Step 2', () => {
    const validPublicKeyPath = join(__dirname, 'test-public-key.txt');
    const invalidPublicKeyPath = join(__dirname, 'test-invalid-key.txt');
    const emptyPublicKeyPath = join(__dirname, 'test-empty-key.txt');

    beforeAll(() => {
      // Create test public key files
      writeFileSync(validPublicKeyPath, '0x1234567890abcdef1234567890abcdef12345678');
      writeFileSync(invalidPublicKeyPath, 'invalid-key');
      writeFileSync(emptyPublicKeyPath, '');
    });

    afterAll(() => {
      // Clean up test files
      try {
        unlinkSync(validPublicKeyPath);
        unlinkSync(invalidPublicKeyPath);
        unlinkSync(emptyPublicKeyPath);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should display generate command help', () => {
      try {
        const result = execSync(`node ${cliPath} generate --help`, { encoding: 'utf8' });
        expect(result).toContain('generate');
        expect(result).toContain('public-key');
        expect(result).toContain('vanity-address-prefix');
        expect(result).toContain('budget-glm');
        expect(result).toContain('Path to file containing the public key');
      } catch (error: any) {
        expect(error.stdout).toContain('generate');
        expect(error.stdout).toContain('public-key');
        expect(error.stdout).toContain('vanity-address-prefix');
        expect(error.stdout).toContain('budget-glm');
        expect(error.stdout).toContain('Path to file containing the public key');
      }
    });

    it('should require all mandatory arguments for generate command', () => {
      try {
        execSync(`node ${cliPath} generate`, { encoding: 'utf8' });
        fail('Should have thrown an error for missing arguments');
      } catch (error: any) {
        expect(error.stderr || error.stdout).toContain('required');
      }
    });

    it('should require public-key argument', () => {
      try {
        execSync(`node ${cliPath} generate --vanity-address-prefix test --budget-glm 100`, { encoding: 'utf8' });
        fail('Should have thrown an error for missing public-key');
      } catch (error: any) {
        expect(error.stderr || error.stdout).toContain('public-key');
      }
    });

    it('should require vanity-address-prefix argument', () => {
      try {
        execSync(`node ${cliPath} generate --public-key ${validPublicKeyPath} --budget-glm 100`, { encoding: 'utf8' });
        fail('Should have thrown an error for missing vanity-address-prefix');
      } catch (error: any) {
        expect(error.stderr || error.stdout).toContain('vanity-address-prefix');
      }
    });

    it('should require budget-glm argument', () => {
      try {
        execSync(`node ${cliPath} generate --public-key ${validPublicKeyPath} --vanity-address-prefix test`, { encoding: 'utf8' });
        fail('Should have thrown an error for missing budget-glm');
      } catch (error: any) {
        expect(error.stderr || error.stdout).toContain('budget-glm');
      }
    });

    it('should validate public key file exists', () => {
      try {
        execSync(`node ${cliPath} generate --public-key /nonexistent/file.txt --vanity-address-prefix test --budget-glm 100`, { encoding: 'utf8' });
        fail('Should have thrown an error for nonexistent file');
      } catch (error: any) {
        expect(error.stderr || error.stdout).toContain('Public key file not found');
      }
    });

    it('should validate public key format from file', () => {
      try {
        execSync(`node ${cliPath} generate --public-key ${invalidPublicKeyPath} --vanity-address-prefix test --budget-glm 100`, { encoding: 'utf8' });
        fail('Should have thrown an error for invalid public key');
      } catch (error: any) {
        expect(error.stderr || error.stdout).toContain('Invalid public key format');
      }
    });

    it('should validate budget-glm is a positive number', () => {
      try {
        execSync(`node ${cliPath} generate --public-key ${validPublicKeyPath} --vanity-address-prefix test --budget-glm -50`, { encoding: 'utf8' });
        fail('Should have thrown an error for negative budget');
      } catch (error: any) {
        expect(error.stderr || error.stdout).toContain('Budget must be a positive number');
      }
    });

    it('should execute generate command with valid arguments', () => {
      const result = execSync(`node ${cliPath} generate --public-key ${validPublicKeyPath} --vanity-address-prefix test --budget-glm 100`, { encoding: 'utf8' });
      expect(result).toContain('Starting vanity address generation');
      expect(result).toContain('Public Key File:');
      expect(result).toContain('Public Key: 0x1234567890abcdef1234567890abcdef12345678');
      expect(result).toContain('Vanity Address Prefix: test');
      expect(result).toContain('Budget (GLM): 100');
    });
  });

  describe('OpenTelemetry Integration', () => {
    it('should initialize OpenTelemetry without throwing errors', () => {
      const result = execSync(`node ${cliPath} hello`, { 
        encoding: 'utf8',
        timeout: 10000 
      });
      expect(result).toContain('OpenTelemetry initialized successfully');
    });
  });
});

describe('Unit Tests for Generate Command Functions', () => {
  const testPublicKeyPath = join(__dirname, 'unit-test-public-key.txt');
  const testInvalidKeyPath = join(__dirname, 'unit-test-invalid-key.txt');
  const testEmptyKeyPath = join(__dirname, 'unit-test-empty-key.txt');

  beforeAll(() => {
    // Create test files for unit tests
    writeFileSync(testPublicKeyPath, '0x1234567890abcdef1234567890abcdef12345678');
    writeFileSync(testInvalidKeyPath, 'invalid-key-format');
    writeFileSync(testEmptyKeyPath, '');
  });

  afterAll(() => {
    // Clean up test files
    try {
      unlinkSync(testPublicKeyPath);
      unlinkSync(testInvalidKeyPath);
      unlinkSync(testEmptyKeyPath);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('readPublicKeyFromFile', () => {
    it('should read valid public key from file', () => {
      const publicKey = readPublicKeyFromFile(testPublicKeyPath);
      expect(publicKey).toBe('0x1234567890abcdef1234567890abcdef12345678');
    });

    it('should throw error for nonexistent file', () => {
      expect(() => readPublicKeyFromFile('/nonexistent/file.txt')).toThrow('Public key file not found');
    });

    it('should throw error for empty file', () => {
      expect(() => readPublicKeyFromFile(testEmptyKeyPath)).toThrow('Public key file is empty');
    });

    it('should handle relative paths correctly', () => {
      const relativePath = './src/__tests__/unit-test-public-key.txt';
      const publicKey = readPublicKeyFromFile(relativePath);
      expect(publicKey).toBe('0x1234567890abcdef1234567890abcdef12345678');
    });
  });

  describe('validateGenerateOptions', () => {
    it('should validate correct options successfully', () => {
      const validOptions = {
        publicKey: '0x1234567890abcdef1234567890abcdef12345678',
        vanityAddressPrefix: 'test',
        budgetGlm: 100
      };
      
      expect(() => validateGenerateOptions(validOptions)).not.toThrow();
    });

    it('should throw error for missing public key', () => {
      const invalidOptions = {
        vanityAddressPrefix: 'test',
        budgetGlm: 100
      };
      
      expect(() => validateGenerateOptions(invalidOptions)).toThrow('Public key is required');
    });

    it('should throw error for invalid public key format', () => {
      const invalidOptions = {
        publicKey: 'invalid-key',
        vanityAddressPrefix: 'test',
        budgetGlm: 100
      };
      
      expect(() => validateGenerateOptions(invalidOptions)).toThrow('Invalid public key format');
    });

    it('should throw error for missing vanity address prefix', () => {
      const invalidOptions = {
        publicKey: '0x1234567890abcdef1234567890abcdef12345678',
        budgetGlm: 100
      };
      
      expect(() => validateGenerateOptions(invalidOptions)).toThrow('Vanity address prefix is required');
    });

    it('should throw error for empty vanity address prefix', () => {
      const invalidOptions = {
        publicKey: '0x1234567890abcdef1234567890abcdef12345678',
        vanityAddressPrefix: '',
        budgetGlm: 100
      };
      
      expect(() => validateGenerateOptions(invalidOptions)).toThrow('Vanity address prefix cannot be empty');
    });

    it('should throw error for vanity address prefix that is too long', () => {
      const invalidOptions = {
        publicKey: '0x1234567890abcdef1234567890abcdef12345678',
        vanityAddressPrefix: 'a'.repeat(21), // Maximum is 20 characters
        budgetGlm: 100
      };
      
      expect(() => validateGenerateOptions(invalidOptions)).toThrow('Vanity address prefix too long');
    });

    it('should throw error for invalid budget', () => {
      const invalidOptions = {
        publicKey: '0x1234567890abcdef1234567890abcdef12345678',
        vanityAddressPrefix: 'test',
        budgetGlm: -1
      };
      
      expect(() => validateGenerateOptions(invalidOptions)).toThrow('Budget must be a positive number');
    });

    it('should throw error for budget exceeding maximum', () => {
      const invalidOptions = {
        publicKey: '0x1234567890abcdef1234567890abcdef12345678',
        vanityAddressPrefix: 'test',
        budgetGlm: 1000001 // Maximum is 1,000,000
      };
      
      expect(() => validateGenerateOptions(invalidOptions)).toThrow('Budget exceeds maximum allowed');
    });
  });

  describe('getPackageVersion', () => {
    it('should return a valid semantic version string', () => {
      const version = getPackageVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(typeof version).toBe('string');
    });
  });

  describe('initializeOpenTelemetry', () => {
    it('should not throw when called', () => {
      expect(() => initializeOpenTelemetry()).not.toThrow();
    });
  });
});
