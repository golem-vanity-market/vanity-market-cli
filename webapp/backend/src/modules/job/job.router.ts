import { initServer } from "@ts-rest/fastify";
import { contract } from "../../../../shared/contracts/index.ts";
import * as JobService from "./job.service.ts";

const s = initServer();

export const jobRouter = s.router(contract.jobs, {
  createJob: async ({ body, request }) => {
    const user = request.user;
    const job = await JobService.createJob(body, user.id);

    return { status: 202, body: job };
  },
  listJobs: async ({ request }) => {
    const user = request.user;
    const jobs = await JobService.findJobsByUserId(user.id);
    return { status: 200, body: jobs };
  },
  getJobDetails: async ({ params }) => {
    const job = await JobService.findJobById(params.id);
    if (!job) {
      return { status: 404, body: { message: "Job not found" } };
    }
    return { status: 200, body: job };
  },
  getJobResult: async ({ params }) => {
    const result = await JobService.getJobResult(params.id);
    if (!result) {
      return { status: 404, body: { message: "Result not found" } };
    }
    return { status: 200, body: result };
  },
});
