import type { OfferProposal } from "@golem-sdk/golem-js";
import type { AppContext } from "../app_context";
import { Reputation } from "../reputation/reputation";
import { ROTATION } from "../rotation_mode";

export const proposalPool = new Map<string, OfferProposal>();

export const filterProposal =
  (ctx: AppContext, rep: Reputation) => (proposal: OfferProposal) => {
    if (proposal.id == "golem") {
      return true;
    }
    const MINIMUM_CPU_CORES = parseInt(process.env.MINIMUM_CPU_CORES || "1");
    const threadCount = proposal.properties["golem.inf.cpu.threads"];
    if (threadCount < MINIMUM_CPU_CORES) {
      ctx
        .L()
        .debug(
          `Proposal ${proposal.id} has insufficient CPU cores: ${threadCount} < ${MINIMUM_CPU_CORES}`,
        );
      return false;
    }

    if (ROTATION) {
      // Rotation: only admit providers the ranking marks eligible (not
      // resting, not already holding a slot, wallet under its cap, not
      // suspended). Unknown providers pass — that's the exploration path.
      if (!rep.isEligible(proposal.provider.id)) {
        ctx
          .L()
          .debug(
            `Skipping provider ${proposal.provider.id} (rotation: not eligible right now)`,
          );
        return false;
      }
    } else if (rep.isProviderBanned(proposal.provider.id)) {
      ctx.L().info(`Skipping banned provider: ${proposal.provider.id}`);
      return false;
    }

    proposalPool.set(proposal.provider.id, proposal);
    // If the proposal is not from Golem, we can filter it out
    return true;
  };

export const selectBestProvider =
  (ctx: AppContext, estimatedRentHours: number, rep?: Reputation) =>
  (proposals: OfferProposal[]): OfferProposal => {
    if (proposals.length === 0) {
      throw new Error("No proposals available to select from.");
    }

    if (ROTATION && rep) {
      return lotterySelect(ctx, estimatedRentHours, rep, proposals);
    }

    let bestProposal = proposals[0];
    for (const proposal of proposals) {
      const totalCost = proposal.getEstimatedCost(estimatedRentHours);
      if (totalCost < bestProposal.getEstimatedCost(estimatedRentHours)) {
        bestProposal = proposal;
      }
    }
    const providerId = bestProposal.provider?.id ?? "N/A";
    ctx.info(
      `Selected proposal ${bestProposal.id} from provider ${providerId} with cost ${bestProposal.getEstimatedCost(estimatedRentHours)}`,
    );
    return bestProposal;
  };

/**
 * Rotation lottery: draw the next provider at random, weighted by its rank,
 * instead of always taking the cheapest offer. Price still matters twice —
 * offers above the hard price caps never reach this point, and the rank's
 * dominant component is TH/GLM, which is price-adjusted by construction.
 *
 * One ticket per provider (several proposals from the same provider collapse
 * into its cheapest one), and ineligible providers are dropped here too in
 * case eligibility changed after filterProposal admitted them. If that drops
 * everyone, fall back to the full list — returning something is mandatory.
 */
function lotterySelect(
  ctx: AppContext,
  estimatedRentHours: number,
  rep: Reputation,
  proposals: OfferProposal[],
): OfferProposal {
  const byProvider = new Map<string, OfferProposal>();
  for (const p of proposals) {
    const id = p.provider?.id;
    if (!id) continue;
    const cur = byProvider.get(id);
    if (
      !cur ||
      p.getEstimatedCost(estimatedRentHours) <
        cur.getEstimatedCost(estimatedRentHours)
    ) {
      byProvider.set(id, p);
    }
  }
  if (byProvider.size === 0) {
    return proposals[0];
  }

  let candidates = [...byProvider.values()].filter((p) =>
    rep.isEligible(p.provider.id),
  );
  if (candidates.length === 0) {
    candidates = [...byProvider.values()];
  }

  const weights = candidates.map((p) =>
    Math.max(0.001, rep.rankingFor(p.provider.id).weight),
  );
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  let chosen = candidates[candidates.length - 1];
  let chosenWeight = weights[weights.length - 1];
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      chosen = candidates[i];
      chosenWeight = weights[i];
      break;
    }
  }
  ctx.info(
    `Rotation lottery: picked ${chosen.provider.name} (${chosen.provider.id}) ` +
      `weight ${chosenWeight.toFixed(3)} of ${totalWeight.toFixed(2)} total ` +
      `across ${candidates.length} candidates, ` +
      `est. cost ${chosen.getEstimatedCost(estimatedRentHours).toFixed(4)} GLM`,
  );
  return chosen;
}
