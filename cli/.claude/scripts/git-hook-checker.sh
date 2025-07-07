#!/bin/bash
# Git hook checker for Claude Code

# Read JSON input from stdin
input=$(cat)

# Extract command from JSON
command=$(echo "$input" | jq -r '.command // empty')

# Check if it's a git command
if [[ "$command" == git* ]]; then
  # Parse git command
  if [[ "$command" == *"git add"* ]]; then
    echo "🔍 Git add detected - running format and lint checks..."
    ./.claude/scripts/pre-commit-checks.sh --format-only
    exit_code=$?
    if [ $exit_code -ne 0 ]; then
      echo "❌ Pre-commit checks failed for git add"
      exit 2
    fi
    echo "✅ Format and lint checks passed for git add"
  elif [[ "$command" == *"git push"* ]]; then
    echo "🚀 Git push detected - running full checks (format, lint, tests)..."
    ./.claude/scripts/pre-commit-checks.sh
    exit_code=$?
    if [ $exit_code -ne 0 ]; then
      echo "❌ Pre-commit checks failed for git push"
      exit 2
    fi
    echo "✅ All checks passed for git push"
  fi
fi

# Allow the command to proceed
exit 0