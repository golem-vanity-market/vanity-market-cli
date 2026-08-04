import type { AppContext } from "../app_context";

/**
 * Provider reputation with optional shared ban server support
 * (OPERATIONS.md 6b - common ban for all requestors).
 *
 * When BAN_SERVER_URL is set:
 *  - the fleet-wide ban list is pulled periodically and consulted next to the
 *    local list when filtering proposals,
 *  - every local ban is reported to the ban server so all other requestors
 *    stop signing the provider as well.
 *
 * The local list keeps its original per-cycle semantics and is what
 * /providers/banned exposes - the ban server ingests it per requestor, so it
 * must never contain the shared list (that would echo bans back and forth).
 */
/** Enforcement targets pulled from the ban server; null = no server value,
 *  callers fall back to the local thresholds. */
export interface ProviderTargets {
  efficiency: number | null; // TH/GLM
  speed: number | null; // H/s
}

export class Reputation {
  private _bannedProviders: string[] = [];
  private _sharedBanned: Set<string> = new Set();
  private _globalTargets: ProviderTargets | null = null;
  private _targetOverrides: Map<string, ProviderTargets> = new Map();
  private readonly _banServerUrl: string | null;
  private readonly _banServerSource: string;
  private _refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this._banServerUrl = process.env.BAN_SERVER_URL?.replace(/\/$/, "") || null;
    this._banServerSource =
      process.env.BAN_SERVER_SOURCE || process.env.NODE_NAME || "requestor";
    if (this._banServerUrl) {
      const refreshSecs = parseFloat(
        process.env.BAN_SERVER_REFRESH_SECS || "30",
      );
      void this._refreshSharedList();
      void this._refreshTargets();
      this._refreshTimer = setInterval(() => {
        void this._refreshSharedList();
        void this._refreshTargets();
      }, refreshSecs * 1000);
      // never keep the process alive because of the sync loop
      this._refreshTimer.unref?.();
    }
  }

  private async _refreshSharedList(): Promise<void> {
    if (!this._banServerUrl) {
      return;
    }
    try {
      const resp = await fetch(`${this._banServerUrl}/api/v1/bans/active`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) {
        return;
      }
      const data = (await resp.json()) as { bannedProviders?: string[] };
      if (Array.isArray(data.bannedProviders)) {
        this._sharedBanned = new Set(
          data.bannedProviders.map((p) => p.toLowerCase()),
        );
      }
    } catch {
      // ban server unreachable - keep the last known shared list
    }
  }

  private async _refreshTargets(): Promise<void> {
    if (!this._banServerUrl) {
      return;
    }
    try {
      const resp = await fetch(`${this._banServerUrl}/api/v1/targets`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) {
        return;
      }
      const data = (await resp.json()) as {
        global?: { efficiencyTarget?: number; speedTarget?: number };
        overrides?: {
          providerId?: string;
          efficiencyTarget?: number | null;
          speedTarget?: number | null;
        }[];
      };
      if (
        typeof data.global?.efficiencyTarget === "number" &&
        typeof data.global?.speedTarget === "number"
      ) {
        this._globalTargets = {
          efficiency: data.global.efficiencyTarget,
          speed: data.global.speedTarget,
        };
      }
      if (Array.isArray(data.overrides)) {
        const map = new Map<string, ProviderTargets>();
        for (const o of data.overrides) {
          if (typeof o.providerId !== "string") continue;
          map.set(o.providerId.toLowerCase(), {
            efficiency:
              typeof o.efficiencyTarget === "number"
                ? o.efficiencyTarget
                : null,
            speed: typeof o.speedTarget === "number" ? o.speedTarget : null,
          });
        }
        this._targetOverrides = map;
      }
    } catch {
      // ban server unreachable - keep the last known targets
    }
  }

  /**
   * Effective enforcement targets for a provider: per-provider override from
   * the ban server, then the server's global target. Returns null when the
   * ban server never answered - callers keep their local env thresholds.
   */
  public targetsFor(providerId: string): ProviderTargets | null {
    const override = this._targetOverrides.get(providerId.toLowerCase());
    const global = this._globalTargets;
    if (!override && !global) {
      return null;
    }
    return {
      efficiency: override?.efficiency ?? global?.efficiency ?? null,
      speed: override?.speed ?? global?.speed ?? null,
    };
  }

  private _reportBan(
    ctx: AppContext,
    providerId: string,
    reason: string,
  ): void {
    if (!this._banServerUrl) {
      return;
    }
    fetch(`${this._banServerUrl}/api/v1/bans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId,
        reason,
        source: this._banServerSource,
      }),
      signal: AbortSignal.timeout(10_000),
    })
      .then(() => {
        this._sharedBanned.add(providerId.toLowerCase());
      })
      .catch((e) => {
        ctx.L().warn(`Failed to report ban to ban server: ${e}`);
      });
  }

  public bannedProviders(): object {
    return this._bannedProviders;
  }

  public sharedBannedProviders(): string[] {
    return [...this._sharedBanned];
  }

  isProviderBanned(providerId: string): boolean {
    return (
      this._bannedProviders.includes(providerId) ||
      this._sharedBanned.has(providerId.toLowerCase())
    );
  }

  numberOfBannedProviders(): number {
    return this._bannedProviders.length;
  }

  reset(ctx: AppContext): void {
    ctx.L().info("Resetting banned providers list");
    // Only the local per-cycle list resets - the fleet-wide ban clock is
    // owned by the ban server and expires there.
    this._bannedProviders = [];
  }

  /**
   * Adds a provider to the banned list.
   * @param ctx - The application context for logging.
   * @param providerId - The ID of the provider to ban.
   * @returns true if the provider was already banned, false otherwise.
   */
  ban(ctx: AppContext, providerId: string, reason: string): boolean {
    if (this._bannedProviders.includes(providerId)) {
      return true;
    }
    const wasBannedBefore = this.isProviderBanned(providerId);
    this._bannedProviders.push(providerId);
    this._reportBan(ctx, providerId, reason);
    return wasBannedBefore;
  }
}
