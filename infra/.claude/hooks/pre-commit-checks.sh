#!/bin/bash
# Pre-commit checks for Claude Code hooks

set -o nounset
set -o errexit
set -o pipefail

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
if ! just fmt; then
  echo "❌ Format check failed. Running format fix..."
  just fmt_fix
  echo "✅ Format fixed"
fi

# Run policies
echo "🔐 Running policies..."
if ! just policies; then
  echo "❌ Policy checks failed. Please review policy violations."
  exit 2
fi

# Run lint
echo "🔍 Running lint..."
if ! just tfsec; then
  echo "❌ Lint failed. Please fix security issues manually."
  exit 2
fi

# TODO add extra check for policy and/or test
# Run tests if requested
#if [ "$TESTS" = true ] && [ "$FORMAT_ONLY" = false ]; then
#  echo "🧪 Running tests..."
#  if ! npm test; then
#    echo "❌ Tests failed. Please fix before committing."
#    exit 2
#  fi
#fi

echo "✅ All checks passed!"
