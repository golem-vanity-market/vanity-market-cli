import { Agreement } from "@golem-sdk/golem-js";
import { eq } from "drizzle-orm";
import { AppContext } from "../app_context";
import {
  NewProviderJobModel,
  providerJobsTable,
  NewProofModel,
  proofsTable,
  GeneratedAddressCategory,
} from "../lib/db/schema";
import { GolemSessionRecorder } from "../node_manager/types";
import { VanityResult } from "../node_manager/result";

import { v4 as uuidv4 } from "uuid";

export class GollemSessionRecorderImpl implements GolemSessionRecorder {
  async agreementAcquired(
    ctx: AppContext,
    jobId: string,
    agreement: Agreement,
  ): Promise<string> {
    const id = uuidv4();
    const newProviderJob: NewProviderJobModel = {
      id: id,
      agreementId: agreement.id,
      jobId: jobId,
      status: "pending",
      providerId: agreement.provider.id,
      providerName: agreement.provider.name,
      providerWalletAddress: agreement.provider.walletAddress,
    };

    await ctx.getDB().insert(providerJobsTable).values(newProviderJob);
    return id;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  async jobStarted(ctx: AppContext, jobProviderId: string): Promise<any> {
    return ctx
      .getDB()
      .update(providerJobsTable)
      .set({
        status: "started",
      })
      .where(eq(providerJobsTable.id, jobProviderId));
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  async jobCompleted(ctx: AppContext, jobProviderId: string): Promise<any> {
    return ctx
      .getDB()
      .update(providerJobsTable)
      .set({
        status: "completed",
        endTime: new Date().toISOString(),
      })
      .where(eq(providerJobsTable.id, jobProviderId));
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  async jobStopped(ctx: AppContext, jobProviderId: string): Promise<any> {
    return ctx
      .getDB()
      .update(providerJobsTable)
      .set({
        status: "stopped",
        endTime: new Date().toISOString(),
      })
      .where(eq(providerJobsTable.id, jobProviderId));
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  async jobFailed(
    ctx: AppContext,
    jobProviderId: string,
    _error: string,
  ): Promise<any> {
    return ctx
      .getDB()
      .update(providerJobsTable)
      .set({
        status: "failed",
        endTime: new Date().toISOString(),
      })
      .where(eq(providerJobsTable.id, jobProviderId));
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  async resultFailedParsing(
    ctx: AppContext,
    jobProviderId: string,
  ): Promise<any> {
    return ctx
      .getDB()
      .update(providerJobsTable)
      .set({
        offence: "nonsense",
      })
      .where(eq(providerJobsTable.id, jobProviderId));
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  async resultInvalidVanityKey(
    ctx: AppContext,
    jobProviderId: string,
  ): Promise<any> {
    return ctx
      .getDB()
      .update(providerJobsTable)
      .set({
        offence: "incorrect results",
      })
      .where(eq(providerJobsTable.id, jobProviderId));
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  async proofsStore(
    ctx: AppContext,
    jobProviderId: string,
    results: VanityResult[],
  ): Promise<any> {
    const newProofs: NewProofModel[] = results.map((res) => {
      const vanityProblem: GeneratedAddressCategory =
        res.type === "user-pattern"
          ? {
              type: "user-pattern",
              pattern: res.pattern,
              difficulty: res.estimatedComplexity,
            }
          : {
              type: "proof",
              category: res.score.bestCategory.category,
              score: res.score.bestCategory.score,
              difficulty: res.score.bestCategory.difficulty,
            };
      return {
        providerJobId: jobProviderId,
        addr: res.address,
        salt: res.salt,
        pubKey: res.pubKey,
        vanityProblem,
      };
    });
    return ctx.getDB().insert(proofsTable).values(newProofs);
  }
}
