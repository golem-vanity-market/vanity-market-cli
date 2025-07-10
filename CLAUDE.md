# CLAUDE.md - vanity.market Project Management

This document contains essential information for managing the vanity.market project, which consists of:

- **CLI**: Self-contained command-line interface (cli/)
- **SaaS**: Web application (webapp/)

## Project Resources

### JIRA Board

- **Board URL**: https://unoperate.atlassian.net/jira/software/projects/GOL/boards/82
- **Project Key**: GOL

### Google Spreadsheet

- **Plan**: https://docs.google.com/spreadsheets/d/13PALoUwM0zfAaME66HackqH3LiffFHjEpYCIafYGnVo/edit?gid=1248582987#gid=1248582987&range=A12:A23

### Additional Documentation

- **Design Doc**: https://docs.google.com/document/d/1uQCl548xVI7DX_ykY_yxzahHhkkv8ODGJtpJk1FIeLg/edit?tab=t.0#heading=h.mrakbabhnmym
- **Product Spec**: https://docs.google.com/document/d/10MnCkt5k9sX0xF7sOUCUnMFIOLZIuS_L_G3xe9k4ZXI/edit?tab=t.0#heading=h.k9gvamsqfnm6

## Automation Tools

### Atlassian CLI (acli) and Atlassian MCP

- **Documentation**:
  - acli: https://developer.atlassian.com/cloud/acli/
- **Purpose**: JIRA automation and management
- **Installation**: Follow the official documentation for setup

### GitHub CLI (gh)

- **Purpose**: GitHub repository management, PR automation
- **Common commands**:
  - `gh pr create` - Create pull requests
  - `gh pr list` - List pull requests
  - `gh issue create` - Create issues

### Google SDK

- **Purpose**: Google Spreadsheet integration and automation
- **Use cases**:
  - Sync project data with Google Sheets
  - Generate reports from spreadsheet data
  - Automate data entry and updates

## Prettier

**IMPORTANT**: You MUST run prettier on ALL files you create or modify as part of your workflow.

```bash
npx prettier <FILE> --write
```

Run this command on every file you create or edit before completing any task.

## Project Structure

```
vanity.market/
├── cli/              # Self-contained CLI application
├── webapp/           # SaaS web application
├── z_mgmt/           # Management scripts and automation
└── sandbox/          # Development environment setup
```

## Management Workflows

### Daily Operations

1. Check JIRA board for task updates
2. Review GitHub PRs and issues
3. Update Google Spreadsheet with progress
4. Run automated status reports

### Weekly Planning

1. Sync JIRA tasks with Google Spreadsheet plan
2. Generate weekly progress reports
3. Update project metrics and KPIs

## Testing and Quality

- **Lint command**: Run project-specific linting (check package.json/Makefile)
- **Type checking**: Run TypeScript checks before commits
- **Test suite**: Execute full test suite before releases

## Communication

- **Discord**: Primary communication channel
- **JIRA**: Task tracking and project management
- **GitHub**: Code reviews and technical discussions
