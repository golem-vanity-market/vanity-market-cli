#### **1. Core Concept**

The system uses CPU computation to search for hashes that begin with a specific prefix.

- **Example:** When searching for a target like `0x123456789`, the system is designed to accept any hash that starts with a partial prefix, such as `0x123456...`.
- We only need to provide a part of the full combination, not the exact hash we are searching for.

#### **2. Proof of Compute Mechanism**

The total work ("compute done") is measured by the number of valid prefixes found, which correlates directly to the number of hashes calculated.

- **Unit of Work:** "Compute done" is calculated in Hashes (H).
- **Example CPU Performance:** A single CPU can compute approximately 5 MH/s (MegaHashes per second).
- **Difficulty Calculation:** The difficulty of finding a prefix with six hexadecimal characters (3 bytes) is 1 in 256³, which equates to circa 16.8 million hashes (16.8 MH).
- **Performance Expectation:** A machine computing at 5 MH/s should find a 6-hex prefix roughly every 3-4 seconds.
- **Proof Estimation:** Based on this, the total compute done can be estimated as: `N * 16.8 MH`, where `N` is the number of 6-hex prefixes found.

#### **3. Technical Constraints and Decisions**

- **Complex Pattern Matching:** Complicated pattern matching is computationally very expensive for CPUs in this generation and has been avoided.
- **GPU Implementation:** There are additional development costs for implementing the GPU part of the code, so the focus remains on the CPU.

#### **4. Risk Analysis: Intentional Hiding of Results**

- **The Attack:** A malicious provider could intentionally hide a desirable address from the computation. For example, they could find `0x123556789` but choose not to report it.

  - This risk is greater if we search for an obvious or publicly known valuable pattern. Searching for a less obvious pattern mitigates this.

- **Detection and Mitigation:**

  - **Question:** How do we detect that someone is doing this?
  - **Possible Ideas:** Statistical analysis? Querying for multiple patterns?
  - **Conclusion:** There is no easy way to deal with this attack.

- **Risk Assessment:**
  - **Recommendation:** The problem should be left as is unless it becomes a significant issue.
  - **Likelihood:** This is a low-risk attack.
  - **Counter-Incentive:** The argument against this is that the provider will do more work without getting paid for the hidden result. In the long run, this strategy is unlikely to work, as the provider can be statistically identified as a "bad luck guy" and lose business.

#### **5. GPU**

- **GPU Implementation:** When running on GPU, 8 first hex characters are used instead of 6. 4.3GH is smallest unit of work.
- It is easy to implement the GPU part of the code.
- On most powerful GPUs it is on average possible to compute one for every 3 seconds. 10 seconds on mid-range GPUs.
- Due to how algorithm works, it is not possible to get results more often than every 30 seconds (even more preferably), otherwise performance is lowered.
