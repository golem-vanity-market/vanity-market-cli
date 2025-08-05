import type { AppContext } from "../app_context";
import type { Reputation } from "../node_manager/types";

export class ReputationImpl implements Reputation {
  private bannedProviders: string[] = [];

  markForTermination(_providerId: string): boolean {
    throw new Error("Method not implemented.");
  }

  isProviderBanned(providerId: string): boolean {
    return this.bannedProviders.includes(providerId);
  }

  /**
   * Adds a provider to the banned list.
   * @param ctx - The application context for logging.
   * @param providerId - The ID of the provider to ban.
   * @returns true if the provider was already banned, false otherwise.
   */
  addBannedProvider(ctx: AppContext, providerId: string): boolean {
    const wasBannedBefore = this.isProviderBanned(providerId);
    if (wasBannedBefore) {
      return true;
    }
    this.bannedProviders.push(providerId);
    return false;
  }
}
