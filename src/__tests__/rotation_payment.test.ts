import { EstimatorService } from "../estimator_service";
import type { ResultsService } from "../results_service";
import {
  ROTATION_MIN_EFFICIENCY,
  ROTATION_MIN_EFF_GRACE_GLM,
} from "../rotation_mode";
import { getCtxForTests } from "./utils";

// The rotation minimum-efficiency payment guard: large bills for essentially
// no proved work are refused; everything else — small amounts, healthy work,
// unknown agreements — is paid.
describe("rotationPaymentRefusalReason", () => {
  const makeService = async (jobId: string): Promise<EstimatorService> => {
    const service = new EstimatorService(getCtxForTests("rotation-payment"), {
      processLoopSecs: 1,
      problems: [],
      resultService: null as unknown as ResultsService,
    });
    await service.initJobIfNotInitialized(jobId, "prov", "0xprov", "0xw", 1e12);
    return service;
  };

  it("always accepts amounts within the grace threshold", async () => {
    const service = await makeService("agr-1");
    expect(
      service.rotationPaymentRefusalReason(
        "agr-1",
        ROTATION_MIN_EFF_GRACE_GLM,
      ),
    ).toBeNull();
    expect(service.rotationPaymentRefusalReason("agr-1", 0.001)).toBeNull();
  });

  it("refuses a large bill with zero proved work", async () => {
    const service = await makeService("agr-1");
    const reason = service.rotationPaymentRefusalReason("agr-1", 0.5);
    expect(reason).not.toBeNull();
    expect(reason).toContain("minimum-efficiency floor");
  });

  it("accepts a large bill once measured efficiency clears the floor", async () => {
    const service = await makeService("agr-1");
    // 1 TH of proved work on a 0.5 GLM bill = 2 TH/GLM, far above the floor
    service.getEstimator("agr-1").addProvedWork(1e12);
    expect(service.rotationPaymentRefusalReason("agr-1", 0.5)).toBeNull();
  });

  it("refuses when work exists but is far below the floor", async () => {
    const service = await makeService("agr-1");
    // pick a bill that puts measured efficiency at half the floor
    const attempts = 1e9; // 1 GH
    service.getEstimator("agr-1").addProvedWork(attempts);
    const bill = attempts / 1e12 / (ROTATION_MIN_EFFICIENCY / 2);
    expect(bill).toBeGreaterThan(ROTATION_MIN_EFF_GRACE_GLM);
    expect(service.rotationPaymentRefusalReason("agr-1", bill)).not.toBeNull();
  });

  it("pays agreements it cannot judge (no estimator)", async () => {
    const service = await makeService("agr-1");
    expect(service.rotationPaymentRefusalReason("unknown-agr", 5)).toBeNull();
  });
});
