#!/bin/bash
set -o nounset
set -o errexit
set -o pipefail

TARGET_DIR=/home/eb/workspace-golem/golem-vanity-market-cli
SRC_GIT_TAG=v0.1.8
SRC_DIR="temp/golem-vanity.market-$SRC_GIT_TAG"
SRC_DIR_CLI="$SRC_DIR/cli"

echo "1. Create a worktree for tag ${SRC_GIT_TAG} as a src - $SRC_DIR"

if [ ! -d "$SRC_DIR" ]; then
    mkdir -p temp
    git worktree add $SRC_DIR "$SRC_GIT_TAG"
fi

# not in the old releases
cp cli/README_public.md $TARGET_DIR/README.md
cp cli/PATTERN_GEN_DIFF.md $TARGET_DIR/PATTERN_GEN_DIFF.md
cp cli/LICENSE $TARGET_DIR/LICENSE

echo "2. Copying CLI code to $TARGET_DIR"

if [ ! -d "$TARGET_DIR" ]; then
    echo "Directory $TARGET_DIR does not exist"; exit 1;
fi

pushd $SRC_DIR_CLI
cp -r src $TARGET_DIR
cp -r tools $TARGET_DIR
cp .prettierignore .prettierrc $TARGET_DIR
cp .env.template $TARGET_DIR
cp .npmignore $TARGET_DIR
cp package.json $TARGET_DIR
cp package-lock.json $TARGET_DIR
cp forward.js $TARGET_DIR
cp tsconfig.json $TARGET_DIR
cp eslint.config.mjs $TARGET_DIR
cp drizzle.config.ts $TARGET_DIR
popd

echo "3. Copying github actions"
pushd $SRC_DIR
mkdir -p $TARGET_DIR/.github/workflows/
cp -r .github/workflows/cli_npm.yaml $TARGET_DIR/.github/workflows/
popd
