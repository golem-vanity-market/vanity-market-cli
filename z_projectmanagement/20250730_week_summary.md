# Weekly Summary: July 23 - August 1, 2025 (v0.1.5 → v0.1.6)

## Overview

This extended period focused on persistence improvements, database migration, testing enhancements, and CLI fixes, culminating in the v0.1.6 release on August 1st. The team delivered significant infrastructure changes including the migration from SQLite to PostgreSQL for the webapp backend, completed persistence layer implementation, and enhanced testing coverage. Four major JIRA tasks were completed (archived) during this timeframe, demonstrating substantial progress on persistence and database architecture initiatives.

## Key Development & Challenges

Highlights:

- running on mainet: complex patterns, CPU, maximum 17h on mainnet, 15 providers
- running on mainnet: many hours of testing
- storage introduced
- Released open-source version:
  - [v0.1.6](https://github.com/golem-vanity-market/golem-vanity-market-cli)
  - vanity.market on golem.network

Lowlights:

- 🚨 YAGNA has issues with handling more than 10 agreements
- more bugs in golem-js (last week, we released [v3.5.1](https://github.com/golemfactory/golem-js/releases/tag/v3.5.1)) - ongoing fixes - [beta release](https://github.com/golemfactory/golem-js/releases/tag/v3.5.0-beta.4)

- 500s from YAGNA

Focus for the next cycle:

- Reputation & banning bad providers
- Improve monitoring
- Complex patterns (postponed due to ongoing testing on mainnet)

Misc:

- [Estimated difficulty](https://docs.google.com/spreadsheets/d/13eYLRJEZAhE5hIw1MDSyRKrstTuwxxrdB_1MsSgjMXc/edit?gid=0#gid=0)

## JIRA - Tasks Completed

- [GOL-74: Migrate backend DB to Postgres](https://unoperate.atlassian.net/browse/GOL-74)
- [GOL-73: Bug: Don't kill entire process if payment fail (like allocation not found)](https://unoperate.atlassian.net/browse/GOL-73)
- [GOL-50: Persist relevant data for reputation](https://unoperate.atlassian.net/browse/GOL-50)
- [GOL-49: Add persistence to CLI](https://unoperate.atlassian.net/browse/GOL-49)

## GitHub

The extended period delivered substantial infrastructure improvements with 15 PRs merged, including the official v0.1.6 release. Development focused on four key areas: database architecture modernization with PostgreSQL migration, persistence layer implementation for data reliability, testing infrastructure with comprehensive webapp test coverage, and CLI stability improvements including hashrate estimation enhancements.

**Pull Requests Merged:**

🛠️ **CLI (9 PRs):**

- [#102: v0.1.6](https://github.com/Unoperate/golem-vanity.market/pull/102)
- [#101: Release/20250801](https://github.com/Unoperate/golem-vanity.market/pull/101)
- [#99: Added db setup to CLI test so it can pass](https://github.com/Unoperate/golem-vanity.market/pull/99)
- [#96: More detailed hashrate estimator](https://github.com/Unoperate/golem-vanity.market/pull/96)
- [#93: Update prepare scripts for Yagna installation](https://github.com/Unoperate/golem-vanity.market/pull/93)
- [#91: Spec estimation](https://github.com/Unoperate/golem-vanity.market/pull/91)
- [#89: Chore/update cli claude md](https://github.com/Unoperate/golem-vanity.market/pull/89)
- [#88: Security: Bump @eslint/plugin-kit to v0.3.4](https://github.com/Unoperate/golem-vanity.market/pull/88)
- [#64: Persistence](https://github.com/Unoperate/golem-vanity.market/pull/64)

🌐 **Webapp (4 PRs):**

- [#83: migrate sqlite to postgres](https://github.com/Unoperate/golem-vanity.market/pull/83)
- [#82: Fix/quick fix to webapp tests + introduce linter](https://github.com/Unoperate/golem-vanity.market/pull/82)
- [#71: Webapp testing](https://github.com/Unoperate/golem-vanity.market/pull/71)
- [#67: Prevent unhandled exception in golem-js](https://github.com/Unoperate/golem-vanity.market/pull/67)

**📋 Management (2 PRs):**

- [#86: Report/kanban 20250723](https://github.com/Unoperate/golem-vanity.market/pull/86)
- [#84: Tool/improve pr review command](https://github.com/Unoperate/golem-vanity.market/pull/84)

The overall development focus was on infrastructure stability and testing coverage, with significant technical impact through database modernization and persistence improvements, culminating in the successful v0.1.6 release.

## Engineering Metrics

**GitHub:**

- **11 PRs merged** during this period
- **Avg time to merge**: 31.8 hours (1.3 days)
- **Avg time to first review**: 41.3 hours (1.7 days)
- **4/11 PRs** received reviews
- **7/11 PRs** merged without review

**Tasks:**

- **3 oldest tickets in progress:**
  - [GOL-56: Set up the dev env for SaaS and Continuous Deployment - talk with Adam](https://unoperate.atlassian.net/browse/GOL-56): 482 hours
  - [GOL-57: Reputation module](https://unoperate.atlassian.net/browse/GOL-57): 506 hours
  - [GOL-64: Running vanity.market on production (loop), cup 1000 GLM per week - CEQ will provide GLMs - document the setup and store any neccessary scripts it in our github](https://unoperate.atlassian.net/browse/GOL-64): 386 hours

- **3 oldest tickets in TODO:**
  - [GOL-15: Adding and removing workers in the workerpool.](https://unoperate.atlassian.net/browse/GOL-15): 925 hours
  - [GOL-16: Node reputation v1](https://unoperate.atlassian.net/browse/GOL-16): 923 hours
  - [GOL-32: We have a domain - vanity.market. WB: shall we set up a page? Coming soon, etc.](https://unoperate.atlassian.net/browse/GOL-32): 732 hours

## Next Week Tasks

**In Progress:**

- [GOL-80: Fix: cli tries to sign expired agreements and gets stuck](https://unoperate.atlassian.net/browse/GOL-80)
- [GOL-78: Extend the patterns given to our customers (what is attractive)](https://unoperate.atlassian.net/browse/GOL-78)
- [GOL-77: Define problems that we will ask profinity to calculare, what else than prefix](https://unoperate.atlassian.net/browse/GOL-77)
- [GOL-64: Running vanity.market on production (loop), cup 1000 GLM per week - CEQ will provide GLMs - document the setup and store any neccessary scripts it in our github](https://unoperate.atlassian.net/browse/GOL-64)
- [GOL-57: Reputation module](https://unoperate.atlassian.net/browse/GOL-57)
- [GOL-56: Set up the dev env for SaaS and Continuous Deployment - talk with Adam](https://unoperate.atlassian.net/browse/GOL-56)

---

**Note**: This summary covers the exact time range from 2025-07-23 14:30 CET to 2025-08-01 12:00 CET, with GitHub changes between v0.1.5...v0.1.6.
