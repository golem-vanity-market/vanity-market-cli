import {
  GenerationEntryResult,
  ResultsService,
  ResultsServiceOptions,
} from "../results";
import { sleep } from "@golem-sdk/golem-js";

function generateRandomEntryResult(): GenerationEntryResult {
  return {
    addr: `0x${Math.random().toString(16).substring(2, 42)}`,
    salt: `0x${Math.random().toString(16).substring(2, 18)}`,
    pubKey: `pubKey-${Math.random().toString(36).substring(2, 15)}`,
    provider: {
      id: `provider-${Math.random().toString(36).substring(2, 15)}`,
      name: `Provider ${Math.floor(Math.random() * 1000)}`,
      walletAddress: `0x${Math.random().toString(36).substring(2, 15)}`,
    },
  };
}

function defaultResultsTestOptions(): ResultsServiceOptions {
  return {
    refreshEveryS: 0.1, // Default refresh interval in seconds
    csvOutput: null, // Default CSV file name
  };
}

describe("Results service", () => {
  it("Results service test", async () => {
    const opt = defaultResultsTestOptions();
    const srv = new ResultsService(opt);
    await sleep(0.5);
    srv.addResult(generateRandomEntryResult());
    srv.stop();
    await srv.waitForFinish();
  });
});
