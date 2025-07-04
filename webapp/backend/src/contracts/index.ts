import { initContract } from "@ts-rest/core";
import { authContract } from "./auth.contract";
import { jobsContract } from "./job.contract";

const c = initContract();

export const contract = c.router({
  auth: authContract,
  jobs: jobsContract,
});
