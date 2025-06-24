/**
 * This example demonstrates how to scan the market for providers that meet specific requirements.
 */
import { GolemNetwork, OfferProposal } from "@golem-sdk/golem-js";
import { filter, map, switchMap, take } from "rxjs";
import dotenv from "dotenv";
import { GenerationParams, GenerationResults } from "./scheduler";

dotenv.config();

const CRUNCHER_VERSION = process.env.CRUNCHER_VERSION ?? "prod-12.4.1";
const USE_CPU = ["true", "1"].includes(
  (process.env.USE_CPU || "").toLowerCase(),
);

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function computeOnGolem(
  generationParams: GenerationParams,
): Promise<GenerationResults> {
  const generationResults: GenerationResults = {
    entries: [],
  };

  const glm = new GolemNetwork();

  const rentalDurationHours =
    (generationParams.numberOfPasses * generationParams.singlePassSeconds) /
      3600 +
    0.1;
  const allocationDurationHours = rentalDurationHours + 0.1;

  console.assert(
    allocationDurationHours > rentalDurationHours,
    "Always create allocations that will live longer than the planned rental duration",
  );

  let allocation;
  try {
    await glm.connect();

    console.log("Allocation duration: ", allocationDurationHours, " hours");
    console.log("Rental duration: ", rentalDurationHours, " hours");
    // Define the order that we're going to place on the market

    const allocation = await glm.payment.createAllocation({
      budget: generationParams.budgetGlm,
      expirationSec: Math.round(allocationDurationHours * 3600),
      paymentPlatform: "erc20-polygon-glm",
    });
    const _requestorIdentity = allocation.address;
    const order = {
      demand: {
        workload: {
          imageTag: `nvidia/cuda-x-crunch:${CRUNCHER_VERSION}`,
          capabilities: ["!exp:gpu"],
          engine: "vm-nvidia",
        },
      },
      market: {
        rentHours: rentalDurationHours,
        pricing: {
          model: "linear",
          maxStartPrice: 0.0,
          maxCpuPerHourPrice: 0.0,
          maxEnvPerHourPrice: 2.0,
        },
      },
      payment: {
        allocation,
      },
    };
    // Allocate funds to cover the order, we will only pay for the actual usage
    // so any unused funds will be returned to us at the end

    // Convert the human-readable order to a protocol-level format that we will publish on the network
    const demandSpecification = await glm.market.buildDemandDetails(
      order.demand,
      // @ts-expect-error descr
      order.market,
      allocation,
    );

    // Publish the order on the market
    // This methods creates and observable that publishes the order and refreshes it every 30 minutes.
    // Unsubscribing from the observable will remove the order from the market
    const demand$ = glm.market.publishAndRefreshDemand(demandSpecification);

    // Now, for each created demand, let's listen to proposals from providers
    const offerProposal$ = demand$.pipe(
      switchMap((demand) => glm.market.collectMarketProposalEvents(demand)),
      // to keep things simple we don't care about any other events
      // related to this demand, only proposals from providers
      filter((event) => event.type === "ProposalReceived"),
      map((event) => {
        console.log(
          "Received proposal from provider",
          event.proposal.provider.name,
        );
        return event.proposal;
      }),
    );

    // Each received proposal can be in one of two states: initial or draft
    // Initial proposals are the first ones received from providers and require us to respond with a counter-offer
    // Draft proposals are the ones that we have already negotiated and are ready to be accepted
    // Both types come in the same stream, so let's write a handler that will respond to initial proposals
    // and save draft proposals for later
    const draftProposals: OfferProposal[] = [];
    const offerProposalsSubscription = offerProposal$.subscribe(
      (offerProposal) => {
        if (offerProposal.isInitial()) {
          // here we can define our own counter-offer
          // to keep this example simple, we will respond with the same
          // specification as the one we used to publish the demand
          // feel free to modify this to your needs
          glm.market
            .negotiateProposal(offerProposal, demandSpecification)
            .catch(console.error);
        } else if (offerProposal.isDraft()) {
          draftProposals.push(offerProposal);
        }
      },
    );

    // Let's wait for a couple seconds to receive some proposals
    while (draftProposals.length < 1) {
      console.log("Waiting for proposals...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // We have received at least one draft proposal, we can now stop listening for more
    offerProposalsSubscription.unsubscribe();

    const draftProposal = draftProposals[0];

    console.log("Received proposal", draftProposal);

    const agreement = await glm.market.proposeAgreement(draftProposal);
    console.log("Agreement signed with provider", agreement.provider.name);

    // Provider is ready to start the computation
    // Let's setup payment first
    // As the computation happens, we will receive debit notes to inform us about the cost
    // and an invoice at the end to settle the payment
    const invoiceSubscription = glm.payment
      .observeInvoices()
      .pipe(
        // make sure we only process invoices related to our agreement
        filter((invoice) => invoice.agreementId === agreement.id),
        // end the stream after we receive an invoice
        take(1),
      )
      .subscribe((invoice) => {
        console.log(
          "Received invoice for ",
          invoice.getPreciseAmount().toFixed(4),
          "GLM",
        );
        glm.payment
          .acceptInvoice(invoice, allocation, invoice.amount)
          .catch(console.error);
      });
    const debitNoteSubscription = glm.payment
      .observeDebitNotes()
      .pipe(
        // make sure we only process invoices related to our agreement
        filter((debitNote) => debitNote.agreementId === agreement.id),
      )
      .subscribe((debitNote) => {
        console.log(
          "Received debit note for ",
          debitNote.getPreciseAmount().toFixed(4),
          "GLM",
        );
        glm.payment
          .acceptDebitNote(debitNote, allocation, debitNote.totalAmountDue)
          .catch(console.error);
      });

    // Start the computation
    // First lets start the activity - this will deploy our image on the provider's machine
    const activity = await glm.activity.createActivity(agreement);
    // Then let's create a ExeUnit, which is a set of utilities to interact with the
    // providers machine, like running commands, uploading files, etc.

    const provider = activity.provider;
    const exe = await glm.activity.createExeUnit(activity);

    let cpuCount = 1;
    if (!USE_CPU) {
      await exe.run("nvidia-smi").then((res) => {
        console.log(res);
      });
    } else {
      await exe.run("nproc").then((res) => {
        cpuCount = parseInt(res.stdout?.toString().trim() ?? "N/A");
      });
    }

    console.log("Prefix value: ", generationParams.vanityAddressPrefix.toArg());
    for (let passNo = 0; passNo < generationParams.numberOfPasses; passNo++) {
      if (generationResults.entries.length > 0) {
        console.log(
          "Found addresses in previous pass, stopping further passes",
        );
        break;
      }
      let kernelCount = 64;
      let roundCount = 1000;
      let groupCount = 1000;

      if (USE_CPU) {
        console.log("Using CPU for generation");
        kernelCount = 1;
        groupCount = 1;
        roundCount = 20000;
      }

      const p = generationParams.vanityAddressPrefix.toArg();
      let command;

      if (USE_CPU) {
        if (cpuCount < 1) {
          throw "CPU count cannot be smaller than 1";
        }
        if (cpuCount > 255) {
          throw "CPU count cannot be greater than 255";
        }
        const pp = ` ${p}`.repeat(cpuCount);
        command = `parallel profanity_cuda --cpu -k ${kernelCount} -g ${groupCount} -r ${roundCount} -b ${generationParams.singlePassSeconds} -z ${generationParams.publicKey} -p {} :::${pp}`;
      } else {
        command = `profanity_cuda -g ${groupCount} -r ${roundCount} -k ${kernelCount} -p ${p} -b ${generationParams.singlePassSeconds} -z ${generationParams.publicKey}`;
      }
      console.log("Using command: ", command);
      await exe.run(command).then(async (res) => {
        let _biggestCompute = 0;
        if (res.stderr) {
          const stdErrStr = res.stderr.toString().trim();
          for (const line of stdErrStr.split("\n")) {
            console.log(line);
            if (line.includes("Total compute")) {
              try {
                const totalCompute = line
                  .split("Total compute ")[1]
                  .trim()
                  .split(" GH")[0];
                const totalComputeFloatGh = parseFloat(totalCompute);
                _biggestCompute = totalComputeFloatGh * 1e9;
                console.log("Total compute: " + totalCompute);
              } catch (e) {
                console.error(e);
              }
            }
          }
        } else {
          console.log("No stderr received");
        }
        if (!res.stdout) {
          console.log("No stdout received");
        } else {
          const stdOutStr = res.stdout.toString().trim();

          for (let line of stdOutStr.split("\n")) {
            try {
              line = line.trim();
              if (line.startsWith("0x")) {
                const salt = line.split(",")[0].trim();
                const addr = line.split(",")[1].trim();
                const pubKey = line.split(",")[2].trim();
                //console.log("Address: ", addr);
                //console.log("Address: ", generationParams.vanityAddressPrefix.toHex());
                if (
                  addr.startsWith(
                    generationParams.vanityAddressPrefix
                      .fullPrefix()
                      .toLowerCase(),
                  )
                ) {
                  generationResults.entries.push({
                    addr,
                    salt,
                    pubKey,
                    provider,
                  });
                  console.log(
                    "Found address: ",
                    addr,
                    " with salt: ",
                    salt,
                    " public address: ",
                    pubKey,
                    " prefix: ",
                    generationParams.vanityAddressPrefix
                      .fullPrefix()
                      .toLowerCase(),
                  );
                }
              }
            } catch (e) {
              console.error(e);
            }
          }
        }
      });
    }
    // We're done, let's clean up provider
    // First we need to destroy the activity
    await glm.activity.destroyActivity(activity);
    console.log("Activity destroyed");
    await glm.market.terminateAgreement(agreement);
    console.log("Agreement terminated");

    await sleep(10000); // wait a bit for the invoice and debit note to be processed
    invoiceSubscription.unsubscribe();
    debitNoteSubscription.unsubscribe();

    if (allocation) {
      await glm.payment.releaseAllocation(allocation);
      console.log("Released allocation");
    }
    await glm.disconnect();
    console.log("Disconnected from Golem network");
  } catch (err) {
    if (allocation) {
      await glm.payment.releaseAllocation(allocation);
    }
    await glm.disconnect();
    console.error("Error during crunching:", err);
    throw err;
  }

  return generationResults;
}
