# Solution for Computing Hashrate

## How to Compute Hashrate of the Provider

### Version 1 (Currently Implemented)

- Get all proof addresses that start from a given pattern (prefix).
- Example: If we search for `0x4455667788999` then we are counting all addresses:
    - `0x445566` (on CPU)
    - `0x44556677` (on GPU)
- Each address is considered a proof of work.

---

### Ideal Solution (Target Goal)

- Save all proofs sent by the provider (from multiple preselected and default patterns).
- Compute hashrate based on **all sent proofs to date**.
- ⚠️ Note: This approach is more complex.

> All these proofs are saved and can later be presented to the user, allowing them to choose whatever they want (without re-running).

### Additional steps

- Additionally, save **GLM spent** on the job.
- Add save time of the job.
- This allows us to compute **efficiency of the provider**—the most important factor (unless banned for other reasons).
- cost-efectiveness = (number_of_proofs * difficulty) / spend_glm <- TH/GLM
- speed = (number_of_proofs * difficulty) / time_of_job <- MH/s
- efficiency = (x1 * cost-efectiveness + x2 * speed) / (x1 + x2) <- Some kind of Weighted Average (or other scoring function)

**NEEDED:**
- Table with proofs (or a fancy UI component)
  Proof:
      addr: unique address
      provider_job_id:
      category (may be string or external key to category table)
      salt 
      
- History of the provider_job:
    - provider_id
    - agreement_id (serves as unique provider_job_id)
    - job_id (forein key)
    - glm_spent
    - work_done (GH) <- aggregate
    - start_time
    - end_time
    - (bannable offense, result)
    - ...
 
- Histor of jobs
    - public_key
    - user provided pattern
    - start_time
    - end_time
    - ...
---

## Script Behaviour and Reputation

### During Operation

### This is for long running cli jobs (SAS may use another solution)
- Continuously check for **efficiency** within a recent timeframe (e.g., last 10 minutes).
- If efficiency drops below a threshold (which may be dynamic), **stop operations** on that provider.
- Optionally dynamically remove every 10-30 minutes worst provider
- We are targeting for example N providers, if one goes away then find new one using reputation
  

### Provider Selection

- When selecting a new provider:
    - Check **job history** for highest efficiency providers or select new one that is new.
    - Seweryn suggested to use average of all known providers to estimate new once (ignore offers at all)
    - Filter by time period (e.g., last day).
- Ignore advertised values (unless checking for consistency).
    - Possibly store these in a table in the future.

> If the provider is encountered for the first time, estimation is helpful but not critical. The script will self-adjust to optimal providers over time.

---

## Long-Run Design

- Script should support **long run times (1h+)**.
- Based on tests/experience:
    - Takes ~10 minutes to accurately estimate machine power.
    - If no results in first 2–5 minutes:
        - **Drop the agreement**
        - **Do not pay** for the provider (to avoid scammers)


