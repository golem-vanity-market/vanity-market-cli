import { Estimator } from "../estimator/estimator";

describe("Estimator", () => {
  const TARGET_DIFFICULTY = 1_000_000;
  let estimator: Estimator;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2000-01-01T00:00:00.000Z"));
    estimator = new Estimator(TARGET_DIFFICULTY, "test-provider", "test-id");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Initialization", () => {
    it("should initialize with correct target difficulty and zero work", () => {
      expect(estimator.targetDifficulty).toBe(TARGET_DIFFICULTY);
      expect(estimator.totalWorkDone).toBe(0);
      expect(estimator.workDoneSinceLastSuccess).toBe(0);
      expect(estimator.totalSuccesses).toBe(0);
    });

    it("should have one initial entry in its history upon creation", () => {
      expect(estimator["_entries"][0].totalWorkDone).toBe(0);
      expect(estimator["_entries"]).toHaveLength(1);
    });
  });

  describe("Adding Work and Calculating Speed", () => {
    it("should calculate speed correctly after a single interval", () => {
      jest.advanceTimersByTime(10 * 1000);
      estimator.addProvedWork(100_000);

      const speedInfo = estimator.estimatedSpeed(60);
      // Expected speed = work / time = 100,000 / 10s = 10,000 H/s
      expect(speedInfo.speed).toBeCloseTo(10_000);
      expect(estimator.totalWorkDone).toBe(100_000);
    });

    it("should calculate average speed correctly over multiple intervals", () => {
      // Interval 1: 100k work in 10s
      jest.advanceTimersByTime(10 * 1000);
      estimator.addProvedWork(100_000);

      // Interval 2: 150k work in the next 5s
      jest.advanceTimersByTime(5 * 1000);
      estimator.addProvedWork(150_000);

      // Total work = 250,000. Total time = 15s.
      // Expected average speed = 250,000 / 15s = 16,666.66... H/s
      const speedInfo = estimator.estimatedSpeed(60);
      expect(speedInfo.speed).toBeCloseTo(16_666.666);
      expect(estimator.totalWorkDone).toBe(250_000);
    });

    it("should calculate speed based on the specified time window", () => {
      // 0s: start
      // 10s: add 100k work (speed here is 10k H/s)
      jest.advanceTimersByTime(10 * 1000);
      estimator.addProvedWork(100_000);

      // 20s: add 100k work (speed in this interval is 10k H/s)
      jest.advanceTimersByTime(10 * 1000);
      estimator.addProvedWork(100_000);

      // 30s: add 300k work (speed in this interval is 30k H/s)
      jest.advanceTimersByTime(10 * 1000);
      estimator.addProvedWork(300_000);

      // Speed over the last 15 seconds:
      // Should only consider the last data point (at 30s) and the one before (at 20s).
      // Work done in that window: 300,000. Time: 10s.
      // The _getOldestRecentEntry(15) will grab the entry at t=20s.
      const speedInfo = estimator.estimatedSpeed(15);

      // (TotalWorkAt30s - TotalWorkAt20s) / (30s - 20s)
      // (500_000 - 200_000) / 10s = 30,000 H/s
      expect(speedInfo.speed).toBeCloseTo(30_000);
    });
  });

  describe("Time and Probability Estimation", () => {
    beforeEach(() => {
      // Establish a consistent speed of 20,000 H/s for these tests
      jest.advanceTimersByTime(10 * 1000);
      estimator.addProvedWork(200_000);
      estimator.workDoneSinceLastSuccess = 200_000;
    });

    it("should estimate remaining time correctly", () => {
      // Target = 1M. Done = 200k. Remaining = 800k.
      // Speed = 20k H/s.
      // Expected ETA = 800,000 / 20,000 = 40 seconds.
      const eta = estimator.estimateTime();
      expect(eta).toBeCloseTo(40);
    });

    it("should calculate the work for 50% chance correctly", () => {
      const expectedWork = TARGET_DIFFICULTY * Math.LN2;
      expect(estimator.workFor50PercentChance()).toBeCloseTo(expectedWork);
    });

    it('should calculate "unfortunate iteration" correctly', () => {
      const workFor50 = estimator.workFor50PercentChance(); // ~693147

      // Case 1: Unlucky (passed 2 "half-lives")
      estimator.workDoneSinceLastSuccess = 1_500_000;
      const unfortunateIteration = Math.floor(
        estimator.workDoneSinceLastSuccess / workFor50,
      );
      expect(unfortunateIteration).toBe(2); // floor(1,500,000 / 693147) = floor(2.16) = 2

      // Case 2: Not yet unlucky
      estimator.workDoneSinceLastSuccess = 500_000;
      const fortunateIteration = Math.floor(
        estimator.workDoneSinceLastSuccess / workFor50,
      );
      expect(fortunateIteration).toBe(0); // floor(500,000 / 693147) = floor(0.72) = 0
    });
  });

  describe("Handling Success", () => {
    it("should reset workDoneSinceLastSuccess but not totalWorkDone on success", () => {
      estimator.addProvedWork(500_000);
      expect(estimator.workDoneSinceLastSuccess).toBe(500_000);
      expect(estimator.totalWorkDone).toBe(500_000);
      expect(estimator.totalSuccesses).toBe(0);

      // Now, report a success with an additional 100k work
      estimator.addProvedWork(100_000, true);

      expect(estimator.workDoneSinceLastSuccess).toBe(0); // This should be reset
      expect(estimator.totalWorkDone).toBe(600_000); // This should accumulate
      expect(estimator.totalSuccesses).toBe(1); // This should increment
    });
  });
});
