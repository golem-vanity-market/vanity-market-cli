import { initContract } from "@ts-rest/core";
import { authContract } from "./auth.contract.ts";
import { jobsContract } from "./job.contract.ts";

const c = initContract();

export const contract = c.router({
  auth: authContract,
  jobs: jobsContract,
});
