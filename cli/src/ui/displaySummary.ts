import type { Estimator } from "../estimator/estimator";
import { displayDifficulty, displayTime } from "../utils/format";
import type { ProviderCurrentEstimate } from "../estimator_service";

function getFaceEmoji(
  luckFactor: number,
  unfortunateIteration: number,
): string {
  const ecstaticFace = "😃";
  const smilingFace = "😊";
  const neutralFace = "😐";
  const sadFace = "😢";
  const catastrophicFace = "😱";
  const weepingFace = "😭";

  if (luckFactor > 2) {
    return ecstaticFace;
  }
  switch (unfortunateIteration) {
    case 0:
      return smilingFace;
    case 1:
      return neutralFace;
    case 2:
      return sadFace;
    case 3:
      return catastrophicFace;
    default:
      return weepingFace;
  }
}

export function getProviderEstimatorSummaryMessage(
  ce: ProviderCurrentEstimate,
  label: string,
): string {
  const speed = ce.estimatedSpeed1h;
  const successes = ce.totalSuccesses;
  const eta = ce.remainingTimeSec;
  const etaFormatted = eta !== null ? displayTime("", eta) : "N/A";
  const speedFormatted =
    speed != null ? displayDifficulty(speed.speed) + "/s" : "N/A";
  const glmPerHour = ce.costPerHour != null ? ce.costPerHour.toFixed(5) : "N/A";

  const workCompleted = ce.workDone;
  const workCompletedFormatted = displayDifficulty(workCompleted);
  const efficiencyFormatted =
    ce.totalEfficiency !== null ? ce.totalEfficiency.toFixed(6) : "N/A";
  const face = getFaceEmoji(ce.luckFactor, ce.unfortunateIteration);
  const donePart = successes > 0 ? ` DONE: ${successes}` : "";

  return ` ${label} - WORK: ${workCompletedFormatted}${donePart} ETA: ${etaFormatted} SPEED: ${speedFormatted} PROB: ${(ce.probabilityFactor * 100).toFixed(1)}% \n   -- GLM: ${ce.cost.toFixed(6)}(${glmPerHour}/h) TH/GLM: ${efficiencyFormatted} ${face}`;
}

export function displaySummary(estimators: Map<string, Estimator>): void {
  console.log("\n");
  const now = new Date();
  console.log(`Summary: ${now.toISOString()}`);

  const copyEntries = Array.from(estimators.entries());
  copyEntries.sort((a, b) => {
    const aInfo = a[1].currentInfo();
    const bInfo = b[1].currentInfo();
    return (
      (bInfo.estimatedSpeed1h?.speed ?? 0) -
      (aInfo.estimatedSpeed1h?.speed ?? 0)
    ); // Sort by attempts in descending order
  });
  for (const [jobId, est] of copyEntries) {
    const info = est.currentInfo();
    displayEstimatorSummary(est, `${info.providerName} - ${jobId.slice(0, 5)}`);
  }
}

export function displayTotalSummary(est: Estimator): void {
  displayEstimatorSummary(est, "total");
}

function displayEstimatorSummary(est: Estimator, label: string): void {
  const info = est.currentInfo();
  const unfortunateIteration = Math.floor(
    est.workDoneSinceLastSuccess / est.workFor50PercentChance(),
  );

  const speed = info.estimatedSpeed1h;
  const successes = info.totalSuccesses;
  const eta = info.remainingTimeSec;
  const etaFormatted = eta !== null ? displayTime("", eta) : "N/A";
  const speedFormatted =
    speed !== null ? displayDifficulty(speed.speed) + "/s" : "N/A";
  const glmPerHour =
    speed?.costPerHour != null ? speed.costPerHour.toFixed(5) : "N/A";

  const workCompleted = info.workDone;
  const workCompletedFormatted = displayDifficulty(workCompleted);
  const efficiencyFormatted =
    info.totalEfficiency !== null ? info.totalEfficiency.toFixed(6) : "N/A";
  const face = getFaceEmoji(info.luckFactor, unfortunateIteration);

  const donePart = successes > 0 ? ` DONE: ${successes}` : "";
  const icon = label == "total" ? "🌍" : "💻";
  const costFormatted = info.cost.toFixed(6);

  console.log(
    ` ${icon} ${label} - WORK: ${workCompletedFormatted}${donePart} ETA: ${etaFormatted} SPEED: ${speedFormatted} PROB: ${(info.probabilityFactor * 100).toFixed(1)}% \n   -- GLM: ${costFormatted}(${glmPerHour}/h) TH/GLM: ${efficiencyFormatted} ${face}`,
  );
}
