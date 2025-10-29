import { getCruncherVersion } from "../node_manager/config";
import type { AppContext } from "../app_context";
import type { ProofEntryResult } from "../estimator/proof";
import { JobUploader } from "./job_uploader";
type ProofEvent = {
  event: "proof";
  payload: {
    orderId: string;
    provider: {
      id: string;
      name: string;
      walletAddress: string;
    };
    proofs: {
      address: string;
      salt: string;
    }[];
  };
};

export class NewExternalJobUploader implements JobUploader {
  private uploadBase: string;
  private cruncherVersion: string = getCruncherVersion();

  //@todo, read yagna id from config
  constructor(uploadBase: string) {
    this.uploadBase = uploadBase;
  }

  public async createRemoteJob(
    _ctx: AppContext,
    _providerId: string,
    _providerWalletAddress: string,
    _providerName: string,
  ): Promise<string> {
    return "unused";
  }

  public async uploadProofsToCentralServer(
    ctx: AppContext,
    proofQueue: ProofEntryResult[],
    _uploadUid: string,
    agreementId: string,
  ): Promise<void> {
    if (proofQueue.length === 0) {
      ctx.L().info(`No proofs to upload for job ${agreementId}.`);
      return;
    } else {
      ctx
        .L()
        .info(`Uploading ${proofQueue.length} proofs for job ${agreementId}.`);
    }
    const uploadMany = [];
    for (const entry of proofQueue) {
      if (!entry.matchingUserProblem) {
        // Do not send proofs that do not match any user problem
        continue;
      }
      uploadMany.push({
        salt: entry.salt,
        address: entry.addr,
      });
    }
    if (proofQueue[0].orderId === null) {
      ctx.info("Skipping upload, orderId is null");
      return;
    }

    const event: ProofEvent = {
      event: "proof",
      payload: {
        orderId: proofQueue[0].orderId,
        provider: {
          id: proofQueue[0].provider.id,
          name: proofQueue[0].provider.name,
          walletAddress: proofQueue[0].provider.walletAddress,
        },
        proofs: uploadMany,
      },
    };

    console.log(`Uploading proofs to total estimator: ${this.uploadBase}`);
    const resp = await fetch(`${this.uploadBase}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });
    if (!resp.ok) {
      const error = await resp.text();
      ctx.L().error(`Failed to upload proofs to total estimator: ${error}`);
      throw new Error(`Failed to upload proofs to total estimator`);
    }
  }
}
