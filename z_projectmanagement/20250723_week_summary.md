# Weekly Summary: July 16-23, 2025

## Overview

This week saw significant progress with the release of version v0.1.5, encompassing 88 commits and 12 completed JIRA tasks. Major achievements include open-sourcing the CLI tool, comprehensive webapp testing improvements, GLM balance display functionality, and critical allocation management enhancements. The development team focused on both technical infrastructure and user-facing features.

## Key Development & Challenges & Next Steps

Status ([plan](https://docs.google.com/spreadsheets/d/13PALoUwM0zfAaME66HackqH3LiffFHjEpYCIafYGnVo/edit?gid=1248582987#gid=1248582987)):

1. CLI fully operational with extended task duration support
2. Webapp core components (frontend and backend) completed, including secure enclave implementation

Highlights:

1. Implemented result verification system
2. Completed major refactoring for open-source preparation
3. Released open-source version v0.1.4 - https://github.com/golem-vanity-market/golem-vanity-market-cli
4. Integrated Golem Base sandbox with Central Net - [commit](https://github.com/Unoperate/golem-vanity.market/commit/af20ef9198801008494185a9bce6aed56d45ede4)
5. Resolved Yagna allocation issue - [PR](https://github.com/golemfactory/yagna/pull/3423), integrated in [0.17.1-preview.golembase.28](https://github.com/golemfactory/yagna/releases/tag/pre-rel-v0.17.1-preview.golembase.28) and [yagna master](https://github.com/golemfactory/yagna/commit/6080895dfd5846346d787dfb78d8af6a67c4de12) (🚨 Note: New Yagna release pending due to Golem Base focus)
6. Addressed golem-js issue - [commit](https://github.com/golemfactory/golem-js/commit/85623891767553493f68f3e1e54f24cc05f70bb5) and published [golem-js v3.5.1](https://github.com/golemfactory/golem-js/releases/tag/v3.5.1)

Lowlights:

- Development was slowed down by unexpected bugs
- Focus on open-sourcing and CLI production deployment with Yagna diverted resources from reputation system development

Focus for the next cycle:

1. Continuous running vanity.market CLI on the Yagna mainnet
2. Development of reputation system and persistent storage capabilities
3. Expand generated key patterns capabilities in CLI interface
4. Initialize AWS development environment for webapp deployment

## JIRA - Tasks Completed

- [GOL-76: Wojtek - golem prod](https://unoperate.atlassian.net/browse/GOL-76)
- [GOL-75: Fix static export job id page](https://unoperate.atlassian.net/browse/GOL-75)
- [GOL-72: OpenSource CLI + and all around it](https://unoperate.atlassian.net/browse/GOL-72)
- [GOL-71: Verification of the profinity results](https://unoperate.atlassian.net/browse/GOL-71)
- [GOL-70: Allocation YAGNA - PR to golem-base, go through review, testing](https://unoperate.atlassian.net/browse/GOL-70)
- [GOL-68: update prepare.py to use newest yagna including the allocation fix](https://unoperate.atlassian.net/browse/GOL-68)
- [GOL-63: Golem-base + centralnet - new testing setup requested by Pawel](https://unoperate.atlassian.net/browse/GOL-63)
- [GOL-61: Saas: Display how much GLM the user owns](https://unoperate.atlassian.net/browse/GOL-61)
- [GOL-60: SaaS: E2E test and refactor service architecture](https://unoperate.atlassian.net/browse/GOL-60)
- [GOL-59: SaaS: Generate keypair on the client](https://unoperate.atlassian.net/browse/GOL-59)
- [GOL-35: Allocation extension](https://unoperate.atlassian.net/browse/GOL-35)

## GitHub

**Summary**: The v0.1.4 to v0.1.5 release cycle delivered significant improvements across both CLI and webapp components. Key focus areas included open-sourcing the CLI tool, implementing comprehensive testing infrastructure, enhancing user experience with GLM balance display, and critical backend improvements for allocation management.

**Pull Requests Merged:**

🛠️ **CLI & Infrastructure:**

- [#84: Tool/improve pr review command](https://github.com/Unoperate/golem-vanity.market/pull/84)
- [#82: Fix/quick fix to webapp tests + introduce linter](https://github.com/Unoperate/golem-vanity.market/pull/82)
- [#76: Scx1332/deploy](https://github.com/Unoperate/golem-vanity.market/pull/76)
- [#74: Simple command to prepeare yagna to run on the production](https://github.com/Unoperate/golem-vanity.market/pull/74)
- [#73: Fix command calls due to new CLI](https://github.com/Unoperate/golem-vanity.market/pull/73)
- [#70: Validate generated key by the crunch](https://github.com/Unoperate/golem-vanity.market/pull/70)
- [#69: Base testing](https://github.com/Unoperate/golem-vanity.market/pull/69)
- [#68: Update cmd in the release docs](https://github.com/Unoperate/golem-vanity.market/pull/68)
- [#66: Fixes to README_public.md](https://github.com/Unoperate/golem-vanity.market/pull/66)
- [#63: Download script for pre-rel version of yagna](https://github.com/Unoperate/golem-vanity.market/pull/63)
- [#62: Open sourcing golem-vanity-market-cli](https://github.com/Unoperate/golem-vanity.market/pull/62)

🌐 **Webapp:**

- [#75: Frontend build](https://github.com/Unoperate/golem-vanity.market/pull/75)
- [#71: Webapp testing](https://github.com/Unoperate/golem-vanity.market/pull/71)
- [#67: Prevent unhandled exception in golem-js](https://github.com/Unoperate/golem-vanity.market/pull/67)
- [#65: SaaS: Display GLM balance in top bar](https://github.com/Unoperate/golem-vanity.market/pull/65)
- [#60: SaaS: Generate keypair securely in an iframe](https://github.com/Unoperate/golem-vanity.market/pull/60)
- [#57: Monitor and extend allocation](https://github.com/Unoperate/golem-vanity.market/pull/57)

**Overall Development Focus**: The team prioritized infrastructure improvements, testing reliability, and user experience enhancements while maintaining focus on open-source preparation and production deployment capabilities.

## Engineering Metrics

**GitHub:**

- **18 PRs merged** during this period
- **Avg time to merge**: 28.1 hours (1.2 days)
- **Avg time to first review**: 22.0 hours (0.9 days)
- **10/18 PRs** received reviews

**Tasks:**

_3 oldest tickets in progress:_

- [GOL-49: Add persistence to CLI](https://unoperate.atlassian.net/browse/GOL-49): 326 hours (13.6 days)
- [GOL-50: Persist relevant data for reputation](https://unoperate.atlassian.net/browse/GOL-50): 326 hours (13.6 days)
- [GOL-56: Set up the dev env for SaaS and Continuous Deployment - talk with Adam](https://unoperate.atlassian.net/browse/GOL-56): 318 hours (13.3 days)

_3 oldest tickets in TODO:_

- [GOL-15: Adding and removing workers in the workerpool](https://unoperate.atlassian.net/browse/GOL-15): 720 hours (30.0 days)
- [GOL-16: Node reputation v1](https://unoperate.atlassian.net/browse/GOL-16): 720 hours (30.0 days)
- [GOL-32: We have a domain - vanity.market. WB: shall we set up a page? Coming soon, etc.](https://unoperate.atlassian.net/browse/GOL-32): 552 hours (23.0 days)

## Next Week Tasks

- [GOL-77: Define problems that we will ask profinity to calculare, what else than prefix](https://unoperate.atlassian.net/browse/GOL-77)
- [GOL-74: Migrate backend DB to Postgres](https://unoperate.atlassian.net/browse/GOL-74)
- [GOL-64: Running vanity.market on production (loop), cup 1000 GLM per week - CEQ will provide GLMs - document the setup and store any neccessary scripts it in our github](https://unoperate.atlassian.net/browse/GOL-64)
- [GOL-57: Reputation module](https://unoperate.atlassian.net/browse/GOL-57)
- [GOL-56: Set up the dev env for SaaS and Continuous Deployment - talk with Adam](https://unoperate.atlassian.net/browse/GOL-56)
- [GOL-50: Persist relevant data for reputation](https://unoperate.atlassian.net/browse/GOL-50)
- [GOL-49: Add persistence to CLI](https://unoperate.atlassian.net/browse/GOL-49)
