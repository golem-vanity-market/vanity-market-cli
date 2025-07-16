---
name: week-summary
description: Generate weekly summary from JIRA and GitHub data between two dates
parameters:
  - name: start_date
    description: Start date and time in YYYY-MM-DD HH:MM format with timezone (e.g., 2025-07-10 14:30 CET)
    required: true
  - name: end_date
    description: End date and time in YYYY-MM-DD HH:MM format with timezone (e.g., 2025-07-16 13:00 CET)
    required: true
  - name: github_from
    description: GitHub starting reference (tag or commit hash) to compare from (e.g., v0.1.3, abc123def)
    required: false
  - name: github_to
    description: GitHub ending reference (tag or commit hash) to compare to (e.g., v0.1.4, def456ghi). If not provided, uses HEAD
    required: false
  - name: output_file
    description: Optional output filename (default: YYYYMMDD_week_summary.md)
    required: false
---

I'll generate a weekly summary covering JIRA and GitHub activity between {{start_date}} and {{end_date}}. You MUST only fetch JIRA issues from the GOL project. Be concise, focus on clarity. Think hard.

Let me fetch the data from both sources and create a comprehensive summary.

## Step 1: Fetch completed work from JIRA

Use Atlassian MCP tools.

**CRITICAL**: When using Atlassian MCP searchJiraIssuesUsingJql, convert the timezone to UTC and use the exact datetime format. For example:

- {{start_date}} "2025-07-10 14:30 CET" becomes "2025-07-10 12:30" in UTC
- {{end_date}} "2025-07-16 13:00 CET" becomes "2025-07-16 11:00" in UTC

Definition of completed:

- `project = GOL AND updated >= "{{start_date}}" AND updated < "{{end_date}}" AND status = "ARCHIVED"`

## Step 2: Fetch issues for upcoming week from JIRA

I'll search for JIRA issues that are "In progress" and top 3 from the TODO column using exact time.

**CRITICAL**: For "IN PROGRESS" tasks, use JQL query at the exact {{end_date}} time:

- Convert {{end_date}} to UTC format
- Use JQL: `project = GOL AND status = "IN PROGRESS"`

## Step 3: Fetch what we implemented from GitHub

I'll get GitHub commits and pull requests that were merged during this time period using the GitHub CLI.

**GitHub Reference Comparison**: If {{github_from}} and/or {{github_to}} are provided, I'll fetch changes between these references, ignoring the date range:

- If both {{github_from}} and {{github_to}} are provided: Compare {{github_from}}...{{github_to}}
- If only {{github_from}} is provided: Compare {{github_from}}...HEAD
- If neither are provided: Use date-based filtering with {{start_date}} and {{end_date}} using exact time including hours and minutes.

Use commands like:

- `gh api repos/:owner/:repo/compare/{{github_from}}...{{github_to}}` for commit comparison
- `git log {{github_from}}..{{github_to}} --oneline` for commit history between refs
- `gh pr list --state merged --base main` and filter by commit range

## Step 4: Generate Weekly Report

I'll create a markdown summary following the following format:

- Section 1:
  Title: Overview section and version information.
  Content: Summary of all the changes in JIRA and Github

- Section 2:
  Title: Key Development & Challenges
  Content: "FILL_ME" placeholder

- Section 3:
  Title: "Jira - Tasks Completed"
  Content:
  - Use data fetched in the step 1
  - Every item, should follow the template:

  `[{Ticket Number}: {Ticket Name}]({LINK TO TICKET})`

- Section 4:
  Title: Github
  Content:
  - Use data fetched in the step 3
  - Summary of the changes in 4 lines
  - Pull requests merged - split into PRs for CLI (🛠️) and PRs for webapp (🌐)
  - Overall development focus and technical impact

- Section 5:
  Title: "Next week tasks"
  Content:
  - Fetched in the step 2.
  - Follow the same template for each issue as in Section 3

The output will be saved to: {{output_file}} or z_projectmanagement/{{end_date | replace: "-", ""}}\_week_summary.md
