# Weekly Summary: August 1-8, 2025 (v0.1.6 → v0.1.7)

## Overview

This week marked significant progress in production deployment and code quality improvements. The team completed 13 JIRA tasks, successfully released version 0.1.7, and merged 9 pull requests focused on production readiness, error handling, and infrastructure improvements. Key achievements include implementing deployment scripts, fixing critical async issues, and enhancing logging capabilities.

## Key Development & Challenges

**Upcoming Priorities:**

- **Production Scaling (Top Priority):** Scale to 7 instances and monitor spending.
- **New Pattern Development:** Implement new vanity address patterns.
- **Reputation Module:** Continue development of the reputation system.
- **Pattern Strategy Discussion:** Discuss profanity filters and new patterns (with WB and SC).

**Highlights:**

- The main focus was on running and testing in the production environment.
- Preparations are underway to launch `vanity.market` to the Golem community.
- Infrastructure for SaaS

**Lowlights:**

- **Production Scaling Delays:** The team is awaiting instance availability to run more jobs in the production environment.
- **Yagna Stability Issues:** The `golem-js` library is crashing due to 500 Internal Server Errors from Yagna.

**Observe**

- Yagna Performance

## Jira - Tasks Completed

- [GOL-85: Fix the async code for persistence](https://unoperate.atlassian.net/browse/GOL-85)
- [GOL-84: Merge functionality into main from prod branch](https://unoperate.atlassian.net/browse/GOL-84)
- [GOL-83: Deployment scripts for running AR](https://unoperate.atlassian.net/browse/GOL-83)
- [GOL-82: Fix: cli stops if yagna allocation endpoints throw 500, retry first then end script](https://unoperate.atlassian.net/browse/GOL-82)
- [GOL-80: Fix: cli tries to sign expired agreements and gets stuck](https://unoperate.atlassian.net/browse/GOL-80)
- [GOL-65: Create an public repo for CLI implementation with CI/CD and README instruction on how to run it](https://unoperate.atlassian.net/browse/GOL-65)
- [GOL-64: Running vanity.market on production (loop), cup 1000 GLM per week - CEQ will provide GLMs - document the setup and store any neccessary scripts it in our github](https://unoperate.atlassian.net/browse/GOL-64)
- [GOL-56: Add CI/CD for SaaS with Github && backend on ECS - initial version without exposing it to internet](https://unoperate.atlassian.net/browse/GOL-56)
- [GOL-50: Persist relevant data for reputation](https://unoperate.atlassian.net/browse/GOL-50)
- [GOL-39: Show costs of the workers](https://unoperate.atlassian.net/browse/GOL-39)
- [GOL-32: We have a domain - vanity.market. WB: shall we set up a page? Coming soon, etc.](https://unoperate.atlassian.net/browse/GOL-32)
- [GOL-15: Adding and removing workers in the workerpool (not scalling up)](https://unoperate.atlassian.net/browse/GOL-15)
- [GOL-7: [Dev] Send github notifications to discord](https://unoperate.atlassian.net/browse/GOL-7)

## Github

The development team focused heavily on production deployment and system reliability. Major changes included implementing production deployment scripts, fixing critical async code issues, and enhancing error handling across the CLI. The team also improved code quality with formatting tools and consolidated deployment infrastructure. Key pull requests delivered both immediate production fixes and long-term architectural improvements.

### Pull requests merged:

**🛠️ CLI:**

- [PR #118: Add formatting tools and improve code quality](https://github.com/Unoperate/golem-vanity.market/pull/118)
- [PR #117: remove unused directory](https://github.com/Unoperate/golem-vanity.market/pull/117)
- [PR #116: Move deployment folder](https://github.com/Unoperate/golem-vanity.market/pull/116)
- [PR #114: Scripts for production deployment](https://github.com/Unoperate/golem-vanity.market/pull/114)
- [PR #111: Changes from running on production](https://github.com/Unoperate/golem-vanity.market/pull/111)
- [PR #109: Bring filterProposals and updates to selector to the main](https://github.com/Unoperate/golem-vanity.market/pull/109)
- [PR #108: Add logging convenience methods to AppContext](https://github.com/Unoperate/golem-vanity.market/pull/108)
- [PR #107: error handling and retry logic in BudgetMonitor](https://github.com/Unoperate/golem-vanity.market/pull/107)
- [PR #106: fix: Incorrect async usage](https://github.com/Unoperate/golem-vanity.market/pull/106)
- [PR #105: Empty implementation of recorders in golem service](https://github.com/Unoperate/golem-vanity.market/pull/105)
- [PR #103: Timeout rental operations and refresh demand more often](https://github.com/Unoperate/golem-vanity.market/pull/103)

**🌐 Webapp:**

- [PR #104: week summary 20250730](https://github.com/Unoperate/golem-vanity.market/pull/104)

**Overall development focus:** Production readiness, system reliability, and deployment automation.

## Engineering Metrics

### Github:

- **9 PRs merged** during this period (v0.1.6 → v0.1.7)
- **Avg time to merge**: 16.9 hours (0.7 days)
- **Avg time to first review**: 10.9 hours (0.5 days)
- **7/9 PRs** received reviews

### Tasks:

**3 oldest tickets in progress:**

- [GOL-57: Reputation module](https://unoperate.atlassian.net/browse/GOL-57): 765.3 hours
- [GOL-78: Extend the patterns given to our customers (what is attractive)](https://unoperate.atlassian.net/browse/GOL-78): 453.4 hours
- [GOL-79: What metrics do we want to track (after the production)](https://unoperate.atlassian.net/browse/GOL-79): 453.3 hours

**3 oldest tickets in TODO:**

- [GOL-16: Node reputation v1](https://unoperate.atlassian.net/browse/GOL-16): 1172.6 hours
- [GOL-42: Reputation](https://unoperate.atlassian.net/browse/GOL-42): 815.5 hours
- [GOL-48: Prepare expected hashrates for well known cpu/gpu setups](https://unoperate.atlassian.net/browse/GOL-48): 765.7 hours

## Next week tasks

- [GOL-92: Add user/password for the public websites](https://unoperate.atlassian.net/browse/GOL-92)
- [GOL-90: Welcome on discord - welcome z intro](https://unoperate.atlassian.net/browse/GOL-90)
- [GOL-89: stats for Pawel](https://unoperate.atlassian.net/browse/GOL-89)
- [GOL-87: IaaS SaaS exposing Backend to internet](https://unoperate.atlassian.net/browse/GOL-87)
- [GOL-86: Scale-up running CLI on production](https://unoperate.atlassian.net/browse/GOL-86)
- [GOL-79: What metrics do we want to track (after the production)](https://unoperate.atlassian.net/browse/GOL-79)
- [GOL-78: Extend the patterns given to our customers (what is attractive)](https://unoperate.atlassian.net/browse/GOL-78)
- [GOL-57: Reputation module](https://unoperate.atlassian.net/browse/GOL-57)

---

**Note**: This summary covers the exact time range from 2025-08-01 12:00 CET to 2025-08-08 16:00 CET, with GitHub changes between v0.1.6...v0.1.7.
