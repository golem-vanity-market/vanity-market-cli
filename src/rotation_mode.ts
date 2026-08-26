/**
 * ROTATION MODE — branch feat/rotation.
 *
 * The ban system's replacement: instead of a shared ban list, the ban server
 * serves a per-provider ranking (GET /api/v1/ranking) and the stone turns it
 * into rank-weighted time-sharing of its worker slots:
 *
 *  - filterProposal only admits providers the ranking marks eligible (not
 *    resting after their last session, not already holding a slot anywhere in
 *    the fleet, operator wallet under its concurrency cap, not manually
 *    suspended). Providers the ranking has never seen are admitted — that is
 *    the exploration path for genuinely new nodes.
 *  - selectBestProvider becomes a weighted lottery over the eligible
 *    proposals (weight = rank-derived, unknown providers get a modest
 *    exploration weight) instead of a pure cheapest-price argmin.
 *  - each rental carries a session TTL from its provider's tier (0 = run
 *    until the 6h cycle restart; low tiers get short "auditions"). When the
 *    TTL passes, the rental is gently destroyed after the current pass — the
 *    provider isn't banned, it just rotates out and rests.
 *
 * No bans are ever issued on this branch (it builds on temp/no-ban-pay-all:
 * NO_BAN_PAY_ALL stays on, every invoice is paid). Set ROTATION=0 in a stone
 * .env to fall back to that branch's behavior (accept-all, cheapest-price
 * selection, no TTL) without leaving the branch.
 */
export const ROTATION = (process.env.ROTATION ?? "1") === "1";

/** After this many minutes with cost accrued but zero proved work the rental
 *  is rotated out regardless of tier TTL — a dead slot is the one thing the
 *  100-slot fleet cannot afford to hold for a full shift. */
export const ROTATION_ZERO_WORK_MINUTES = parseFloat(
  process.env.ROTATION_ZERO_WORK_MINUTES || "12",
);

/** Minimum accrued cost (GLM) before the zero-work rotation may fire, so an
 *  agreement that simply hasn't received its first debit note yet is never
 *  judged. */
export const ROTATION_ZERO_WORK_MIN_COST = parseFloat(
  process.env.ROTATION_ZERO_WORK_MIN_COST || "0.02",
);
