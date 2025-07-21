#!/bin/bash

set -o nounset
set -o errexit
set -o pipefail

# Check if PR number is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <pr_number>"
    echo "Example: $0 50"
    exit 1
fi

PR_NUMBER="$1"

PR_INFO=$(gh pr view "$PR_NUMBER" --json headRefName,title,files)
BRANCH_NAME=$(echo "$PR_INFO" | jq -r '.headRefName')
BRANCH_DIR_POSTFIX=$(echo "$PR_INFO" | jq -r '.headRefName' | tr '/' '-')

echo "Copy .claude config (main and cli) files to worktree..."
cp .claude/settings.local.json temp/golem-vanity.market-$BRANCH_DIR_POSTFIX/.claude/settings.local.json
cp cli/.claude/settings.local.json temp/golem-vanity.market-$BRANCH_DIR_POSTFIX/cli/.claude/settings.local.json
