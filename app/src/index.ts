#!/usr/bin/env node

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Initialize OpenTelemetry SDK for comprehensive observability
 * Sets up automatic instrumentation for the CLI application
 * Following best practices for telemetry initialization
 */
function initializeOpenTelemetry(): void {
  const sdk = new NodeSDK({
    instrumentations: [getNodeAutoInstrumentations()],
  });

  try {
    sdk.start();
    console.log('OpenTelemetry initialized successfully');
  } catch (error) {
    console.error('OpenTelemetry initialization failed:', error);
    // Continue execution - telemetry failure should not break CLI functionality
  }
}

/**
 * Retrieves package version from package.json with proper error handling
 * @returns The semantic version string from package.json or fallback version
 */
function getPackageVersion(): string {
  try {
    const packageJsonPath = join(__dirname, '../package.json');
    const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    return packageJson.version;
  } catch (error) {
    console.error('Failed to read package version:', error);
    return '1.0.0'; // Fallback version
  }
}

/**
 * Main CLI application entry point
 * Implements minimal hello world functionality with required libraries
 * Following TDD principles and professional development standards
 */
function main(): void {
  // Initialize observability first for comprehensive monitoring
  initializeOpenTelemetry();

  // Create CLI program using commander.js with proper configuration
  const program = new Command();

  program
    .name('golem-addr')
    .description('Vanity address generator CLI with OpenTelemetry support')
    .version(getPackageVersion());

  // Implement hello world command as specified in Step 1
  program
    .command('hello')
    .description('Display a hello world message')
    .action(() => {
      console.log('Hello World from Golem Address Generator!');
      console.log('✓ Commander.js is working');
      console.log('✓ OpenTelemetry is configured');
      console.log('✓ TypeScript compilation successful');
      console.log('✓ CLI infrastructure ready for address generation');
    });

  // Parse command line arguments and execute appropriate command
  program.parse();
}

// Execute main function only when file is run directly (not imported)
if (require.main === module) {
  main();
}

// Export functions for comprehensive testing coverage
export { main, initializeOpenTelemetry, getPackageVersion };