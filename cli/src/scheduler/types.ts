import type { AppContext } from "../app_context";
import type { Problem } from "../lib/db/schema";
import type { GenerationParams, ProcessingUnitType } from "../params";

export interface SchedulerRecorder {
  startGenerationJob(
    ctx: AppContext,
    generationId: string,
    problem: Problem,
    params: GenerationParams,
    processingUnit: ProcessingUnitType,
  ): Promise<void>;
}
