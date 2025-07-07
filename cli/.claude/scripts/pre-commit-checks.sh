#!/bin/bash
# Pre-commit checks for Claude Code hooks

set -e

echo "Running pre-commit checks..."

# Parse command line arguments
FORMAT_ONLY=false
TESTS=true

while [[ $# -gt 0 ]]; do
  case $1 in
    --format-only)
      FORMAT_ONLY=true
      TESTS=false
      shift
      ;;
    --no-tests)
      TESTS=false
      shift
      ;;
    *)
      shift
      ;;
  esac
done

# Run format check
echo "🎨 Checking format..."
if ! npm run format; then
  echo "❌ Format check failed. Running format fix..."
  npm run format:fix
  echo "✅ Format fixed"
fi

# Run lint
echo "🔍 Running lint..."
if ! npm run lint; then
  echo "❌ Lint failed. Trying to fix..."
  npm run lint:fix
  if ! npm run lint; then
    echo "❌ Lint errors could not be auto-fixed. Please fix manually."
    exit 2
  fi
fi

# Run tests if requested
if [ "$TESTS" = true ] && [ "$FORMAT_ONLY" = false ]; then
  echo "🧪 Running tests..."
  if ! npm test; then
    echo "❌ Tests failed. Please fix before committing."
    exit 2
  fi
fi

echo "✅ All checks passed!"