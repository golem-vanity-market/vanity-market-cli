import type { AppContext } from "./../app_context";
import type { ProofEntryResult } from "./../estimator/proof";
import { ExternalJobUploader, JobUploader } from "./job_uploader";
import type { JobUploaderService } from "./../node_manager/job_uploader";
import { NewExternalJobUploader } from "./new_job_uploader";

class JobUploaderServiceImpl implements JobUploaderService {
  private proofQueue: Map<string, ProofEntryResult[]> = new Map();

  private uploadUids: Map<string, string | null> = new Map();
  private ctx;
  private jobUploaders: JobUploader[];

  constructor(ctx: AppContext, jobUploaders: JobUploader[]) {
    this.ctx = ctx;
    this.jobUploaders = jobUploaders;
  }

  public async initJobIfNotInitialized(
    jobId: string,
    providerName: string,
    providerId: string,
    providerWalletAddress: string,
  ) {
    if (!this.uploadUids.has(jobId)) {
      if (this.jobUploaders.length > 0) {
        const uploadUid =
          (await this.jobUploaders[0]?.createRemoteJob(
            this.ctx,
            providerId,
            providerWalletAddress,
            providerName,
          )) ?? null;
        this.uploadUids.set(jobId, uploadUid);
        const queue: ProofEntryResult[] = [];
        this.proofQueue.set(jobId, queue);
      }
    }
  }

  public async process(agreementId: string): Promise<void> {
    const proofQueue = this.proofQueue.get(agreementId);
    this.proofQueue.set(agreementId, []); // Clear the proof queue after processing

    if (!proofQueue) {
      this.ctx.L().error(`No proof queue found for agreement ${agreementId}.`);
      throw new Error(`No proof queue found for agreement ${agreementId}.`);
    }

    const uploadUid = this.uploadUids.get(agreementId);
    if (!uploadUid) {
      this.ctx.L().error(`Estimator for job ${agreementId} not found.`);
      throw Error("Estimator not found for job: " + agreementId);
    }

    for (const uploader of this.jobUploaders) {
      await uploader.uploadProofsToCentralServer(
        this.ctx,
        proofQueue,
        uploadUid,
        agreementId,
      );
    }
  }

  public pushProofToQueue(result: ProofEntryResult): boolean {
    const jId = result.jobId;
    const queue = this.proofQueue.get(jId);
    if (!queue) {
      this.ctx.L().error(`No proof queue found for job ${jId}.`);
      throw new Error(`No proof queue found for job ${jId}.`);
    }
    queue.push(result);
    return true;
  }
}

export function newJobUploaderService(
  ctx: AppContext,
  oldUploaderBaseUrl: string | null | undefined,
  newUploaderBaseUrl: string | null | undefined,
): JobUploaderService {
  const uploaders: JobUploader[] = [];
  if (oldUploaderBaseUrl) {
    uploaders.push(new ExternalJobUploader(oldUploaderBaseUrl));
  }
  if (newUploaderBaseUrl) {
    uploaders.push(new NewExternalJobUploader(newUploaderBaseUrl));
  }
  return new JobUploaderServiceImpl(ctx, uploaders);
}
