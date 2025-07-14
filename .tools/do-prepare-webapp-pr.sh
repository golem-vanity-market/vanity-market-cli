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
BRANCH_NAME=$(echo "$PR_INFO" | jq -r '.headRefName' | tr '/' '-')

echo "Copy .env files to worktree..."
cp webapp/backend/.env temp/golem-vanity.market-$BRANCH_NAME/webapp/backend/.env
cp webapp/frontend/.env temp/golem-vanity.market-$BRANCH_NAME/webapp/frontend/.env

pushd temp/golem-vanity.market-$BRANCH_NAME/cli
npm install || true
npm run build || true
popd

pushd temp/golem-vanity.market-$BRANCH_NAME/webapp/shared
npm install || true
popd

pushd temp/golem-vanity.market-$BRANCH_NAME/webapp/backend
npm install || true
popd

pushd temp/golem-vanity.market-$BRANCH_NAME/webapp/frontend
npm install || true
popd


