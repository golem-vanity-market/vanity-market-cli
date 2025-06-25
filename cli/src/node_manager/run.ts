import { ResourceRental } from "@golem-sdk/golem-js";
import { AppContext } from "../app_context";
import { GenerationParams } from "../scheduler";
import { displayDifficulty, displayTime } from "../utils/format";
import { BaseWorker } from "./types";
import { Estimator } from "../estimator";
import { computePrefixDifficulty } from "../difficulty";

export async function runOnRental(
  ctx: AppContext,
  rental: ResourceRental,
  generationParams: GenerationParams,
  worker: BaseWorker,
): Promise<void> {
  worker.initEstimator(
    new Estimator(
      computePrefixDifficulty(
        generationParams.vanityAddressPrefix.fullPrefix(),
      ),
    ),
  );

  try {
    // Create ExeUnit from the worker's activity
    const exe = await rental.getExeUnit();
    const provider = exe.provider;

    // Validate worker capabilities (CPU or GPU specific)
    const _capabilityInfo = await worker.validateCapabilities(exe);

    let totalCompute = 0;
    // Run profanity_cuda for the specified number of passes
    for (let passNo = 0; passNo < generationParams.numberOfPasses; passNo++) {
      if (ctx.noResults >= generationParams.numResults) {
        ctx
          .L()
          .info(
            `Found ${ctx.noResults} results in previous pass, stopping further passes`,
          );
        break;
      }

      ctx
        .L()
        .info(`Running pass ${passNo + 1}/${generationParams.numberOfPasses}`);

      const command = worker.generateCommand(generationParams);
      ctx.L().info(`Executing command: ${command}`);

      await exe.run(command).then(async (res) => {
        let biggestCompute = 0;
        // @ts-expect-error descr
        for (const line of res.stderr.split("\n")) {
          //ctx.L().info(line);
          if (line.includes("Total compute")) {
            try {
              const totalCompute = line
                .split("Total compute ")[1]
                .trim()
                .split(" GH")[0];
              const totalComputeFloatGh = parseFloat(totalCompute);
              biggestCompute = totalComputeFloatGh * 1e9;
            } catch (e) {
              ctx.L().error("Error parsing compute stats:", e);
            }
          }
        }

        if (biggestCompute > 0) {
          totalCompute += biggestCompute;
          worker.reportAttempts(totalCompute);
          ctx
            .L()
            .info(
              `Pass ${passNo + 1} compute performance: ${(biggestCompute / 1e9).toFixed(2)} GH/s`,
            );

          const commonInfo = worker.estimatorInfo();
          const unfortunateIteration = Math.floor(
            commonInfo.attempts /
              worker.estimator().estimateAttemptsGivenProbability(0.5),
          );
          const partial =
            commonInfo.attempts /
              worker.estimator().estimateAttemptsGivenProbability(0.5) -
            unfortunateIteration;
          const speed = commonInfo.estimatedSpeed;
          const eta = commonInfo.remainingTimeSec;
          const etaFormatted = eta !== null ? displayTime("", eta) : "N/A";
          const speedFormatted =
            speed !== null ? displayDifficulty(speed.speed) + "/s" : "N/A";
          const bar = "#".repeat(Math.round(partial * 50)).padEnd(50, " ");
          const attemptsCompleted = commonInfo.attempts;
          const attemptsCompletedFormatted =
            displayDifficulty(attemptsCompleted);

          const ecstaticFace = "😃";
          const smilingFace = "😊";
          const neutralFace = "😐";
          const sadFace = "😢";
          const catastrophicFace = "😱";
          const weepingFace = "😭";
          let face;
          if (commonInfo.luckFactor > 2) {
            face = ecstaticFace;
          } else if (unfortunateIteration == 0) {
            face = smilingFace;
          } else if (unfortunateIteration == 1) {
            face = neutralFace;
          } else if (unfortunateIteration == 2) {
            face = sadFace;
          } else if (unfortunateIteration == 3) {
            face = catastrophicFace;
          } else {
            face = weepingFace;
          }
          console.log(
            " --[" +
              bar +
              `]-- ${attemptsCompletedFormatted} ETA: ${etaFormatted} SPEED: ${speedFormatted} ITER: ${unfortunateIteration} LUCK: ${(commonInfo.luckFactor * 100).toFixed(1)}% ${face}`,
          );
        }

        const stdout = res.stdout ? String(res.stdout) : "";
        //ctx.L().info("Received stdout bytes:", stdout.length);

        // Parse results from stdout
        for (let line of stdout.split("\n")) {
          try {
            line = line.trim();
            if (line.startsWith("0x")) {
              const salt = line.split(",")[0].trim();
              const addr = line.split(",")[1].trim();
              const pubKey = line.split(",")[2].trim();

              if (
                addr.startsWith(
                  generationParams.vanityAddressPrefix
                    .fullPrefix()
                    .toLowerCase(),
                )
              ) {
                ctx.addGenerationResult({
                  addr,
                  salt,
                  pubKey,
                  provider,
                });
                ctx
                  .L()
                  .info(
                    `Found address: ${addr}, with salt: ${salt}, public key: ${pubKey}, prefix: ${generationParams.vanityAddressPrefix.toHex()}, provider: ${provider.name}`,
                  );
              }
            }
          } catch (e) {
            ctx.L().error(`Error parsing result line: ${e}`);
          }
        }
      });
    }
  } catch (error) {
    ctx.L().error(`Error during profanity_cuda execution: ${error}`);
    throw new Error("Profanity execution failed");
  }
}
