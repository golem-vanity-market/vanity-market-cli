import { GenerationPrefix } from "./prefix";

/**
 * Interface for task generation parameters
 */
export interface GenerationParams {
  publicKey: string;
  vanityAddressPrefix: GenerationPrefix;
  budgetGlm: number;
  numberOfWorkers: number;
  singlePassSeconds: number;
  numResults: bigint;
}
