import { ProviderInfo } from "@golem-sdk/golem-js";
import { ProcessingUnitType } from "../node_manager/config";

export interface ProofEntryResult {
  addr: string;
  salt: string;
  pubKey: string;
  provider: ProviderInfo;
  jobId: string;
  cpu: ProcessingUnitType;
}
