import {
  Allocation,
  Logger,
  PaymentModuleImpl,
  YagnaApi,
} from "@golem-sdk/golem-js";
import { AppContext } from "../app_context";
import { EstimatorService } from "../estimator_service";
import {
  CreateAllocationParams,
  DebitNote,
  Invoice,
} from "@golem-sdk/golem-js/dist/payment";
import { GolemServices } from "@golem-sdk/golem-js/dist/golem-network";
import { PaymentModuleOptions } from "@golem-sdk/golem-js/dist/payment/payment.module";
import { debitNotesTable, NewDebitNoteModel } from "../lib/db/schema";
import { getErrorMessage } from "../utils/format";
import { NO_BAN_PAY_ALL } from "../temporary_mode";

export class VanityPaymentModule extends PaymentModuleImpl {
  public static estimatorService: EstimatorService;
  public static ctx: AppContext;

  constructor(deps: GolemServices, options?: PaymentModuleOptions) {
    super(deps, options);
  }

  async acceptDebitNote(
    debitNote: DebitNote,
    allocation: Allocation,
    amount: string,
  ): Promise<DebitNote> {
    try {
      VanityPaymentModule.ctx.consoleInfo(
        "Accepting debit note:",
        debitNote.id,
      );

      const amountF = parseFloat(debitNote.totalAmountDue);

      if (isNaN(amountF) || amountF < 0) {
        VanityPaymentModule.ctx
          .L()
          .error(`Invalid amount in debit note: ${debitNote.id}`);
        throw new Error(`Invalid amount in debit note: ${debitNote.id}`);
      }

      if (
        VanityPaymentModule.estimatorService.checkIfProviderFailedToDoWork(
          VanityPaymentModule.ctx,
          debitNote.agreementId,
          amountF,
        )
      ) {
        VanityPaymentModule.ctx
          .L()
          .warn(
            `EstimatorService terminated the agreement for debit note ${debitNote.id}`,
          );
        return debitNote;
      }

      // Rotation minimum-efficiency floor: never accept a large bill for
      // essentially no measured work. Not a ban — the session is rotated out
      // by the scheduler and the provider's rank carries the consequence.
      const refusal =
        VanityPaymentModule.estimatorService.rotationPaymentRefusalReason(
          debitNote.agreementId,
          amountF,
        );
      if (refusal !== null) {
        VanityPaymentModule.ctx
          .L()
          .warn(`NOT accepting debit note ${debitNote.id}: ${refusal}`);
        await VanityPaymentModule.ctx
          .getDB()
          .insert(debitNotesTable)
          .values({
            agreementId: debitNote.agreementId,
            debitNoteId: debitNote.id,
            glmAmount: amountF,
            status: "rejected",
          });
        return debitNote;
      }

      const resp = VanityPaymentModule.estimatorService.reportCosts(
        debitNote.agreementId,
        amountF,
      );

      if (!resp.accepted) {
        VanityPaymentModule.ctx
          .L()
          .error(
            `Failed to report costs for debit note ${debitNote.id}: ${resp.reason}`,
          );
        if (!NO_BAN_PAY_ALL) {
          return debitNote;
        }
        // temporary_mode: pay every agreement regardless of measured work
        VanityPaymentModule.ctx
          .L()
          .warn(
            `NO_BAN_PAY_ALL: accepting debit note ${debitNote.id} despite: ${resp.reason}`,
          );
      }
      const newDebitNote: NewDebitNoteModel = {
        agreementId: debitNote.agreementId,
        debitNoteId: debitNote.id,
        glmAmount: amountF,
        status: resp.accepted ? "accepted" : "rejected",
      };
      await VanityPaymentModule.ctx
        .getDB()
        .insert(debitNotesTable)
        .values(newDebitNote);
      return await super.acceptDebitNote(debitNote, allocation, amount);
    } catch (error) {
      VanityPaymentModule.ctx
        .L()
        .error(
          `Failed to accept debit note ${debitNote.id}: ${getErrorMessage(error)}`,
        );
      throw error;
    }
  }
  async acceptInvoice(
    invoice: Invoice,
    allocation: Allocation,
    amount: string,
  ) {
    try {
      const amountF = parseFloat(invoice.amount);

      if (isNaN(amountF) || amountF < 0) {
        VanityPaymentModule.ctx
          .L()
          .error(`Invalid amount in invoice: ${invoice.id}`);
        throw new Error(`Invalid amount in invoice: ${invoice.id}`);
      }
      if (
        VanityPaymentModule.estimatorService.checkIfProviderFailedToDoWork(
          VanityPaymentModule.ctx,
          invoice.agreementId,
          amountF,
        )
      ) {
        VanityPaymentModule.ctx
          .L()
          .warn(
            `EstimatorService terminated the agreement for invoice ${invoice.id}`,
          );
        return invoice;
      }

      // Rotation minimum-efficiency floor (see acceptDebitNote).
      const refusal =
        VanityPaymentModule.estimatorService.rotationPaymentRefusalReason(
          invoice.agreementId,
          amountF,
        );
      if (refusal !== null) {
        VanityPaymentModule.ctx
          .L()
          .warn(`NOT accepting invoice ${invoice.id}: ${refusal}`);
        return invoice;
      }

      const resp = VanityPaymentModule.estimatorService.reportCosts(
        invoice.agreementId,
        amountF,
      );
      if (!resp.accepted) {
        VanityPaymentModule.ctx
          .L()
          .error(
            `Failed to report costs for invoice ${invoice.id}: ${resp.reason}`,
          );
        if (!NO_BAN_PAY_ALL) {
          return invoice;
        }
        // temporary_mode: pay every agreement regardless of measured work
        VanityPaymentModule.ctx
          .L()
          .warn(
            `NO_BAN_PAY_ALL: accepting invoice ${invoice.id} despite: ${resp.reason}`,
          );
      }

      return await super.acceptInvoice(invoice, allocation, amount);
    } catch (err) {
      VanityPaymentModule.ctx
        .L()
        .error(
          `Failed to accept invoice ${invoice.id}: ${getErrorMessage(err)}`,
        );
      throw err;
    }
  }

  // golem-js doesn't implement amending allocations
  async amendAllocation(
    allocation: Allocation,
    newParams: CreateAllocationParams,
  ): Promise<Allocation> {
    const yagnaAPi: YagnaApi = this["yagnaApi"];
    const logger: Logger = this["logger"];
    try {
      logger.debug("Amending allocation", {
        allocationId: allocation.id,
        ...newParams,
      });
      const now = new Date();
      const newTimeout = new Date(
        +now + newParams.expirationSec * 1000,
      ).toISOString();
      const newAllocationModel = await yagnaAPi.payment.amendAllocation(
        allocation.id,
        {
          timeout: newTimeout,
          totalAmount: newParams.budget.toString(),
        },
      );
      logger.info("Allocation amended", {
        allocationId: allocation.id,
        ...newParams,
      });
      return new Allocation(newAllocationModel);
    } catch (err) {
      logger.error("Error amending allocation", { err });
      throw err;
    }
  }
}
