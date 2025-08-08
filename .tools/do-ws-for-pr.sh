#!/bin/bash

# Create Workspace for PR Script
# Usage: ./do-ws-for-pr.sh <pr_number>

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

echo "Creating workspace for PR #$PR_NUMBER..."

# Step 1: Fetch PR Information
echo "Step 1: Fetching PR information..."
git fetch

# Get PR details
PR_INFO=$(gh pr view "$PR_NUMBER" --json headRefName,title,files)
BRANCH_NAME=$(echo "$PR_INFO" | jq -r '.headRefName')
BRANCH_DIR_POSTFIX=$(echo "$PR_INFO" | jq -r '.headRefName' | tr '/' '-')
PR_TITLE=$(echo "$PR_INFO" | jq -r '.title')

GIT_TOP_DIR=$(git rev-parse --show-toplevel)
TEMP_DIR_FOR_WS="${GIT_TOP_DIR}/temp"
WORKTREE_DIR="${TEMP_DIR_FOR_WS}/golem-vanity.market-$BRANCH_DIR_POSTFIX"

echo "PR Title: $PR_TITLE"
echo "Branch: $BRANCH_NAME"

# Step 2: Create Worktree
echo "Step 2: Creating worktree..."
mkdir -p "$TEMP_DIR_FOR_WS"

# Remove existing worktree if it exists
if [ -d "$WORKTREE_DIR" ]; then
    echo "Removing existing worktree..."
    git worktree remove "$WORKTREE_DIR" --force
fi

git worktree add "$WORKTREE_DIR" "$BRANCH_NAME"

echo "Workspace created successfully at: $WORKTREE_DIR"

# Step 3: Call do-prepare-pr.sh
echo "Step 3: Calling do-prepare-pr.sh..."

SCRIPT_DIR=${GIT_TOP_DIR}/.tools

"$SCRIPT_DIR/do-prepare-pr-claude.sh" "$PR_NUMBER"

echo "Workspace for PR #$PR_NUMBER created and prepared successfully!"