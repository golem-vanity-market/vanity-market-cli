import { Estimator } from "../estimator";
import { displayDifficulty, displayTime } from "../utils/format";
import { displayUserMessage } from "../cli";

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

function displayEstimatorSummary(est: Estimator, label: string): void {
  const info = est.currentInfo();
  const unfortunateIteration = Math.floor(
    info.attempts / est.estimateAttemptsGivenProbability(0.5),
  );
  const speed = info.estimatedSpeed;
  const successes = info.totalSuccesses;
  const eta = info.remainingTimeSec;
  const etaFormatted = eta !== null ? displayTime("", eta) : "N/A";
  const speedFormatted =
    speed !== null ? displayDifficulty(speed.speed) + "/s" : "N/A";
  const attemptsCompleted = info.attempts;
  const attemptsCompletedFormatted = displayDifficulty(attemptsCompleted);

  const face = getFaceEmoji(info.luckFactor, unfortunateIteration);
  const donePart = successes > 0 ? ` DONE: ${successes}` : "";

  const icon = label == "total" ? "🌍" : "💻";
  displayUserMessage(
    ` ${icon} ${label} - ${attemptsCompletedFormatted}${donePart} ETA: ${etaFormatted} SPEED: ${speedFormatted} PROB: ${(info.probabilityFactor * 100).toFixed(1)}% ${face}`,
  );
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
      (bInfo.estimatedSpeed?.speed ?? 0) - (aInfo.estimatedSpeed?.speed ?? 0)
    ); // Sort by attempts in descending order
  });
  for (const [jobId, est] of copyEntries) {
    const info = est.currentInfo();
    displayEstimatorSummary(est, `${info.provName} - ${jobId.slice(0, 5)}`);
  }
}

export function displayTotalSummary(est: Estimator): void {
  displayEstimatorSummary(est, "total");
}
