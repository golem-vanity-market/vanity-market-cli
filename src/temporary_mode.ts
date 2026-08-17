/**
 * TEMPORARY OPERATING MODE — branch temp/no-ban-pay-all only.
 *
 * For one week (2026-08-17 → ~2026-08-24) the fleet runs with:
 *  - no provider bans at all (no local bans, no reports to the ban server,
 *    the shared ban list is ignored when filtering proposals),
 *  - no estimator-driven agreement termination (below-target providers keep
 *    their rentals),
 *  - every debit note and invoice accepted regardless of measured work, so
 *    every agreement gets paid whatever its outcome.
 *
 * The flag defaults ON on this branch so that checking the branch out on a
 * stone is the whole deploy; set NO_BAN_PAY_ALL=0 in the stone .env to switch
 * the mode off without leaving the branch. To end the experiment, check the
 * stones back out on main.
 */
export const NO_BAN_PAY_ALL = (process.env.NO_BAN_PAY_ALL ?? "1") === "1";
