import {
  Allocation,
  DebitNote,
  GolemNetwork,
  Invoice,
} from "@golem-sdk/golem-js";

const NOP = () => {};

export class BudgetMonitor {
  private onLowBudget: () => void = NOP;
  private budgetAlertThreshold: number = 0.1; // Default threshold for low budget alert (10% of total budget)

  public setOnLowBudgetHandler(handler: () => void): void {
    this.onLowBudget = handler;
  }

  private cleanup = NOP;

  constructor() {}

  public startMonitoring(
    allocationId: Allocation["id"],
    glm: GolemNetwork,
  ): void {
    const debitNoteCb = async ({ debitNote }: { debitNote: DebitNote }) => {
      const { remainingAmount, totalAmount } =
        await glm.payment.getAllocation(allocationId);
      const message = `Budget Monitor: Debit Note from ${debitNote.provider.name} accepted. Remaining allocation: ${Number(remainingAmount).toFixed(3)} GLM (${Number(totalAmount).toFixed(3)} GLM total)`;

      console.log(message);
      if (
        Number(remainingAmount) / Number(totalAmount) <
        this.budgetAlertThreshold
      ) {
        this.onLowBudget();
      }
    };
    const invoiceCb = async ({ invoice }: { invoice: Invoice }) => {
      const { remainingAmount, totalAmount } =
        await glm.payment.getAllocation(allocationId);
      const message = `Budget Monitor: Invoice from ${invoice.provider.name} accepted. Remaining allocation: ${Number(remainingAmount).toFixed(3)} GLM (${Number(totalAmount).toFixed(3)} GLM total)`;
      console.log(message);
      if (
        Number(remainingAmount) / Number(totalAmount) <
        this.budgetAlertThreshold
      ) {
        this.onLowBudget();
      }
    };

    glm.payment.events.on("debitNoteAccepted", debitNoteCb);
    glm.payment.events.on("invoiceAccepted", invoiceCb);
    this.cleanup = () => {
      glm.payment.events.off("debitNoteAccepted", debitNoteCb);
      glm.payment.events.off("invoiceAccepted", invoiceCb);
    };
  }

  public stopMonitoring(): void {
    this.cleanup();
    this.onLowBudget = NOP;
  }
}
