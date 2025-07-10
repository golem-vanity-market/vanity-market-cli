---
name: week-summary
description: Generate weekly summary from JIRA and GitHub data between two dates
parameters:
  - name: start_date
    description: Start date in YYYY-MM-DD format
    required: true
  - name: end_date
    description: End date in YYYY-MM-DD format
    required: true
  - name: output_file
    description: Optional output filename (default: YYYYMMDD_week_summary.md)
    required: false
---

I'll generate a weekly summary covering JIRA and GitHub activity between {{start_date}} and {{end_date}}.

Let me fetch the data from both sources and create a comprehensive summary.

## Step 1: Fetch JIRA Data

I'll search for JIRA issues that were completed (moved to DONE status) and archived during this period using the Atlassian MCP tools.

## Step 2: Fetch GitHub Data

I'll get GitHub commits and pull requests that were merged during this time period using the GitHub CLI.

## Step 3: Generate Summary

I'll create a markdown summary following the format of existing summaries in z_projectmanagement/ and save it to the specified output file or default location.

Let me start by getting the JIRA data for the specified date range:

**JIRA Query**: Issues in project GOL that were updated between {{start_date}} and {{end_date}}

**GitHub Query**: Commits and PRs merged between {{start_date}} and {{end_date}}

The summary will include:

- JIRA tasks completed (DONE status)
- JIRA tasks archived during the period
- GitHub commits and development activity
- Pull requests merged
- Overall development focus and technical impact

The output will be saved to: {{output_file}} or z_projectmanagement/{{end_date | replace: "-", ""}}\_week_summary.md
