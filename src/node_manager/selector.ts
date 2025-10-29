import type { OfferProposal } from "@golem-sdk/golem-js";
import type { AppContext } from "../app_context";
import { Reputation } from "../reputation/reputation";

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

    if (rep.isProviderBanned(proposal.provider.id)) {
      ctx.L().info(`Skipping banned provider: ${proposal.provider.id}`);
      return false;
    }

    proposalPool.set(proposal.provider.id, proposal);
    // If the proposal is not from Golem, we can filter it out
    return true;
  };

export const selectBestProvider =
  (ctx: AppContext, estimatedRentHours: number) =>
  (proposals: OfferProposal[]): OfferProposal => {
    if (proposals.length === 0) {
      throw new Error("No proposals available to select from.");
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
