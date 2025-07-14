import { Allocation } from "@golem-sdk/golem-js";
import { GolemSessionManager } from "./node_manager/golem_session";

type AmendSuccessCallback = ({
  timeout,
  budget,
}: {
  timeout: string;
  budget: number;
}) => void;
type AmendErrorCallback = (error: unknown) => void;
type BudgetExhaustedCallback = () => void;

export class BudgetMonitor {
  private budgetAlertThreshold: number = 0.2; // Default threshold for low budget alert (0.2 GLM)
  private topUpAmount: number = 1.0; // Number of GLMs to top up when budget gets low
  private timeoutAmendAmountSec: number = 15 * 60; // Number of second to extend the allocation (15 minutes)
  private monitorIntervalMs: number = 60_000; // How often the check runs
  private isStopped: boolean = false;
  private monitorInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly sessionManager: GolemSessionManager,
    private readonly budgetLimit: number,
  ) {}

  public stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isStopped = true;
  }

  private async getAllocation(): Promise<Allocation> {
    const allocationId = this.sessionManager.getAllocationId();
    return await this.sessionManager
      .getGolemNetwork()
      .payment.getAllocation(allocationId);
  }

  private isBudgetExhausted(allocation: Allocation): boolean {
    // current allocation ran out AND we cannot extend it even further
    return (
      Number(allocation.remainingAmount) < this.budgetAlertThreshold &&
      Number(allocation.totalAmount) >= this.budgetLimit
    );
  }

  private async checkAndAmendBudget(allocation: Allocation) {
    const shouldAmendBudget =
      Number(allocation.remainingAmount) < this.budgetAlertThreshold;
    const newBudget = shouldAmendBudget
      ? Number(allocation.totalAmount) + this.topUpAmount
      : Number(allocation.totalAmount);
    const newAllocation = await this.sessionManager
      .getGolemNetwork()
      .payment.amendAllocation(allocation, {
        budget: newBudget,
        expirationSec: this.timeoutAmendAmountSec,
      });
    return {
      timeout: newAllocation.timeout || "<unknown>",
      budget: Number(newAllocation.totalAmount),
    };
  }

  public startMonitoring({
    onAllocationAmendSuccess,
    onAllocationAmendError,
    onBudgetExhausted,
  }: {
    onAllocationAmendSuccess?: AmendSuccessCallback;
    onAllocationAmendError?: AmendErrorCallback;
    onBudgetExhausted?: BudgetExhaustedCallback;
  }) {
    if (this.monitorInterval) {
      throw new Error("Budget monitor is already running");
    }
    if (this.isStopped) {
      throw new Error("Budget monitor is stopped");
    }
    this.monitorInterval = setInterval(async () => {
      try {
        const allocation = await this.getAllocation();
        if (this.isBudgetExhausted(allocation)) {
          if (onBudgetExhausted) {
            onBudgetExhausted();
          }
          return;
        }
        const { budget, timeout } = await this.checkAndAmendBudget(allocation);
        if (onAllocationAmendSuccess) {
          onAllocationAmendSuccess({ timeout, budget });
        }
      } catch (error) {
        if (onAllocationAmendError) {
          onAllocationAmendError(error);
        }
      }
    }, this.monitorIntervalMs);
  }

  public async displayBudgetInfo(): Promise<void> {
    const allocationId = this.sessionManager.getAllocationId();
    const allocation = await this.sessionManager
      .getGolemNetwork()
      .payment.getAllocation(allocationId);
    console.log(
      `Remaining budget: ${Number(allocation.remainingAmount).toFixed(3)} GLM (out of ${Number(allocation.totalAmount).toFixed(3)} GLM)`,
    );
  }
}
