---
name: pr-review
description: Review a PR by creating a worktree and running claude review in the appropriate directory
parameters:
  - name: pr_number
    description: PR number to review
    required: true
---

I'll review PR #{{pr_number}} by creating a worktree and running a careful review in the appropriate directory.

## Step 1: Fetch PR Information and Create Worktree

First, I'll fetch the latest changes and get PR details to determine the branch name:

```bash
git fetch
gh pr view {{pr_number}} --json headRefName,title,files
```

## Step 2: Create Worktree

You MUST create a worktree in the parent directory using the PR branch name:

```bash
git worktree add temp/golem-vanity.market-[branch-name] [branch-name]
```

## Step 3: Analyze Changes and Determine Review Directory

I'll analyze the PR changes to determine whether most changes are in `cli/` or `webapp/` directory. This analysis happens in the current process.

## Step 4: Execute Review in Separate Claude Process

**IMPORTANT:** Steps 4 MUST be executed by a separate claude process running in the worktree.

I'll change to the worktree directory and execute:

```bash
cd temp/golem-vanity.market-[branch-name]
```

Then navigate to either `cli/` or `webapp/` (whichever has the most changes) and run:

```bash
claude -p "do a careful review and store the review in REVIEW_PR{{pr_number}}.md" --allowedTools "Bash(gh:*),Bash(git: *),Edit
```

This ensures the review is conducted with the proper file context and directory structure of the PR branch.
