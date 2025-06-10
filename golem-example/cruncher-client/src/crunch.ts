/**
 * This example demonstrates how to scan the market for providers that meet specific requirements.
 */
import {GolemNetwork, OfferProposal} from "@golem-sdk/golem-js";
import {filter, last, map, scan, switchMap, take, takeUntil, tap, timer} from "rxjs";
// @ts-ignore
import dotenv from 'dotenv';
import axios from "axios";

dotenv.config();

// @ts-ignore
const ONE_PASS_TIME = parseInt(process.env.ONE_PASS_TIME ?? "60");
// @ts-ignore
const NUMBER_OF_PASSES =  parseInt(process.env.NUMBER_OF_PASSES ?? "10");
// @ts-ignore
const CRUNCHER_VERSION = process.env.CRUNCHER_VERSION ?? "prod-12.4.1";
// @ts-ignore
const CRUNCHER_ALLOCATION = parseFloat(process.env.CRUNCHER_ALLOCATION ?? "0.04");


function timeout(ms: number) {
    // @ts-ignore
    return new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
    );
}

// @ts-ignore
(async () => {

    const glm = new GolemNetwork();

    const RENTAL_DURATION_HOURS = (ONE_PASS_TIME * NUMBER_OF_PASSES) / 3600 + 0.1;
    const ALLOCATION_DURATION_HOURS = RENTAL_DURATION_HOURS + 0.1;

    console.assert(
        ALLOCATION_DURATION_HOURS > RENTAL_DURATION_HOURS,
        "Always create allocations that will live longer than the planned rental duration",
    );

    let allocation;
    try {
        await glm.connect();

        console.log("Allocation duration: ", ALLOCATION_DURATION_HOURS, " hours");
        console.log("Rental duration: ", RENTAL_DURATION_HOURS, " hours");
        // Define the order that we're going to place on the market

        const allocation = await glm.payment.createAllocation({
            budget: CRUNCHER_ALLOCATION,
            expirationSec: Math.round(ALLOCATION_DURATION_HOURS * 3600),
            paymentPlatform: 'erc20-polygon-glm'
        });
        const requestorIdentity = allocation.address;
        const order = {
            demand: {
                workload: {
                    imageTag: `nvidia/cuda-x-crunch:${CRUNCHER_VERSION}`,
                    capabilities: ["!exp:gpu"],
                    engine: "vm-nvidia",
                },
            },
            market: {
                rentHours: RENTAL_DURATION_HOURS,
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
        // @ts-ignore
        const demandSpecification = await glm.market.buildDemandDetails(order.demand, order.market, allocation);

        // Publish the order on the market
        // This methods creates and observable that publishes the order and refreshes it every 30 minutes.
        // Unsubscribing from the observable will remove the order from the market
        const demand$ = glm.market.publishAndRefreshDemand(demandSpecification);

        // Now, for each created demand, let's listen to proposals from providers
        const offerProposal$ = demand$.pipe(
            switchMap((demand) => glm.market.collectMarketProposalEvents(demand)),
            // to keep things simple we don't care about any other events
            // related to this demand, only proposals from providers
            filter(event => event.type === "ProposalReceived"),
            map(event => {
                console.log("Received proposal from provider", event.proposal.provider.name);
                return event.proposal
            })
        );

        // Each received proposal can be in one of two states: initial or draft
        // Initial proposals are the first ones received from providers and require us to respond with a counter-offer
        // Draft proposals are the ones that we have already negotiated and are ready to be accepted
        // Both types come in the same stream, so let's write a handler that will respond to initial proposals
        // and save draft proposals for later
        const draftProposals: OfferProposal[] = [];
        const offerProposalsSubscription = offerProposal$.subscribe((offerProposal) => {
            if (offerProposal.isInitial()) {
                // here we can define our own counter-offer
                // to keep this example simple, we will respond with the same
                // specification as the one we used to publish the demand
                // feel free to modify this to your needs
                glm.market.negotiateProposal(offerProposal, demandSpecification).catch(console.error);
            } else if (offerProposal.isDraft()) {
                draftProposals.push(offerProposal);
            }
        });

        // Let's wait for a couple seconds to receive some proposals
        while (draftProposals.length < 1) {
            console.log("Waiting for proposals...");
            // @ts-ignore
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
                console.log("Received invoice for ", invoice.getPreciseAmount().toFixed(4), "GLM");
                glm.payment.acceptInvoice(invoice, allocation, invoice.amount).catch(console.error);
            });
        const debitNoteSubscription = glm.payment
            .observeDebitNotes()
            .pipe(
                // make sure we only process invoices related to our agreement
                filter((debitNote) => debitNote.agreementId === agreement.id),
            )
            .subscribe((debitNote) => {
                console.log("Received debit note for ", debitNote.getPreciseAmount().toFixed(4), "GLM");
                glm.payment.acceptDebitNote(debitNote, allocation, debitNote.totalAmountDue).catch(console.error);
            });

        // Start the computation
        // First lets start the activity - this will deploy our image on the provider's machine
        const activity = await glm.activity.createActivity(agreement);
        // Then let's create a ExeUnit, which is a set of utilities to interact with the
        // providers machine, like running commands, uploading files, etc.


        const exe = await glm.activity.createExeUnit(activity);

        await exe.run('chmod +x /usr/local/bin/profanity_cuda')
            .then((res) => {

                console.log(res)
            });
        await exe.run('nvidia-smi')
            .then((res) => {
                console.log(res)
            });

        let totalJobComputed = 0;
        for (let passNo = 0; passNo < NUMBER_OF_PASSES; passNo++) {
            await exe.run(`profanity_cuda -k 64 -b ${ONE_PASS_TIME} -z 79dc6f4a3a37adac9dbdf7073823e5596e96ec887eaa16cc01a531d04afd7e442d1e4606800b12d393e47146a5252fef6dced0492687b714515b698fa271c58e`)
                // @ts-ignore
                .then(async (res) => {
                    const multipleResults = [];

                    let biggestCompute = 0;
                    // @ts-ignore
                    for (let line of res.stderr.split('\n')) {
                        console.log(line);
                        if (line.includes('Total compute')) {
                            try {
                                const totalCompute = line.split('Total compute ')[1].trim().split(' GH')[0];
                                const totalComputeFloatGh = parseFloat(totalCompute);
                                biggestCompute = totalComputeFloatGh * 1e9;
                                //console.log("Total compute: " + totalCompute);
                            } catch (e) {
                                console.error(e);
                            }
                        }
                    }
                    totalJobComputed += biggestCompute;
// @ts-ignore

                    console.log("Received stdout bytes: ", res.stdout.length);
// @ts-ignore

                    for (let line of res.stdout.split('\n')) {
                        try {
                            line = line.trim();
                            if (line.startsWith('0x')) {
                                const salt = line.split(',')[0];
                                const addr = line.split(',')[1];
                                const pubKey = line.split(',')[2];
                                console.log("Found address: ", addr, " with salt: ", salt, " public address: ", pubKey);
                            }
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    //todo: do something with the results
                });

        }
        // We're done, let's clean up provider
        // First we need to destroy the activity
        await glm.activity.destroyActivity(activity)
        await glm.market.terminateAgreement(agreement);

        invoiceSubscription.unsubscribe();
        debitNoteSubscription.unsubscribe();

        if (allocation) {
            await glm.payment.releaseAllocation(allocation);
        }
        await glm.disconnect();
    } catch (err) {
        if (allocation) {
            await glm.payment.releaseAllocation(allocation);
        }
        await glm.disconnect();
        throw err;
    }

})();