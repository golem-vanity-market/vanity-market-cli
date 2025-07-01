import { ProviderInfo, sleep } from "@golem-sdk/golem-js";
import { appendFile } from "fs/promises";

export interface GenerationEntryResult {
  addr: string;
  salt: string;
  pubKey: string;
  provider: ProviderInfo;
}

export interface ResultsServiceOptions {
  refreshEveryS: number;
  csvOutput: string | null; // File name for CSV output
}

export function defaultResultsServiceOptions(): ResultsServiceOptions {
  return {
    refreshEveryS: 1, // Default refresh interval in seconds
    csvOutput: "results.csv", // Default CSV file name
  };
}

export class ResultsService {
  private inQueue: GenerationEntryResult[] = [];
  private savedAddr: GenerationEntryResult[] = [];
  private isStopping = false;
  private isFinished = false;
  private finishedPromise!: Promise<void>;
  private finishResolver!: () => void;
  private options;

  constructor(opt: ResultsServiceOptions) {
    this.finishedPromise = new Promise<void>((resolve) => {
      this.finishResolver = resolve;
    });
    this.options = opt;
    const _ = this.runLoop();
  }

  public async results(): Promise<GenerationEntryResult[]> {
    await this.process();
    return this.savedAddr;
  }

  public get numberOfResults(): number {
    return this.inQueue.length + this.savedAddr.length;
  }
  private async process(): Promise<void> {
    for (const entry of this.inQueue) {
      this.savedAddr.push(entry);
      if (this.options.csvOutput) {
        const csvLine = `${entry.addr},${entry.salt},${entry.pubKey},${entry.provider.id},${entry.provider.name},${entry.provider.walletAddress}\n`;
        await appendFile(this.options.csvOutput, csvLine);
      }
    }
    this.inQueue = []; // Clear the queue after processing
  }

  private async runLoop(): Promise<void> {
    while (true) {
      // Process the inQueue entries before checking the stop condition
      await this.process();
      if (this.isStopping) {
        break;
      }

      await sleep(this.options.refreshEveryS);
    }

    this.isFinished = true;
    this.finishResolver(); // ✅ Resolve the promise
  }

  public addResult(result: GenerationEntryResult): boolean {
    if (this.isStopping) {
      return false;
    }
    this.inQueue.push(result);
    return true;
  }

  stop(): void {
    this.isStopping = true;
  }

  async waitForFinish(): Promise<void> {
    await this.finishedPromise;
  }
}
