#!/bin/bash

# PR Review Script
# Usage: ./pr-review.sh <pr_number>

set -e

# Check if PR number is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <pr_number>"
    echo "Example: $0 50"
    exit 1
fi

PR_NUMBER="$1"

echo "Reviewing PR #$PR_NUMBER..."

# Step 1: Fetch PR Information
echo "Step 1: Fetching PR information..."
git fetch

# Get PR details
PR_INFO=$(gh pr view "$PR_NUMBER" --json headRefName,title,files)
BRANCH_NAME=$(echo "$PR_INFO" | jq -r '.headRefName')
PR_TITLE=$(echo "$PR_INFO" | jq -r '.title')

echo "PR Title: $PR_TITLE"
echo "Branch: $BRANCH_NAME"

# Step 2: Create Worktree
echo "Step 2: Creating worktree..."
mkdir -p temp

# Remove existing worktree if it exists
if [ -d "temp/golem-vanity.market-$BRANCH_NAME" ]; then
    echo "Removing existing worktree..."
    git worktree remove "temp/golem-vanity.market-$BRANCH_NAME" --force
fi

git worktree add "temp/golem-vanity.market-$BRANCH_NAME" "$BRANCH_NAME"

# Step 3: Analyze Changes and Determine Review Directory
echo "Step 3: Analyzing changes..."
FILES=$(echo "$PR_INFO" | jq -r '.files[].path')

CLI_CHANGES=0
WEBAPP_CHANGES=0

while IFS= read -r file; do
    if [[ "$file" == cli/* ]]; then
        CLI_CHANGES=$((CLI_CHANGES + 1))
    elif [[ "$file" == webapp/* ]]; then
        WEBAPP_CHANGES=$((WEBAPP_CHANGES + 1))
    fi
done <<< "$FILES"

echo "CLI changes: $CLI_CHANGES"
echo "Webapp changes: $WEBAPP_CHANGES"

# Determine review directory
if [ "$CLI_CHANGES" -gt "$WEBAPP_CHANGES" ]; then
    REVIEW_DIR="cli"
    echo "Most changes in CLI directory"
else
    REVIEW_DIR="webapp"
    echo "Most changes in Webapp directory"
fi

# Step 4: Execute Review in Separate Claude Process
echo "Step 4: Executing review in separate claude process..."
cd "temp/golem-vanity.market-$BRANCH_NAME/$REVIEW_DIR"

echo "Running claude review in $(pwd)..."
claude -p "do a careful review and store the review in REVIEW_PR$PR_NUMBER.md" -d --allowedTools "Read,Write,Bash,Glob,Grep,LS"

# Step 5: Copy Review Back
echo "Step 5: Copying review back to original repository..."
if [ -f "REVIEW_PR$PR_NUMBER.md" ]; then
    cp "REVIEW_PR$PR_NUMBER.md" "../../../REVIEW_PR$PR_NUMBER.md"
    echo "Review completed and saved to REVIEW_PR$PR_NUMBER.md"
else
    echo "Warning: Review file not found"
    exit 1
fi

echo "PR #$PR_NUMBER review completed successfully!"