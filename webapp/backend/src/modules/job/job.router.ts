import { initServer } from "@ts-rest/fastify";
import { contract } from "../../../../shared/contracts/index.ts";
import * as JobService from "./job.service.ts";
import { UnconnectedJobInputSchema } from "../../../../shared/contracts/job.contract.ts";

const s = initServer();

export const jobRouter = s.router(contract.jobs, {
  createJob: {
    handler: async ({ body, request }) => {
      const jobOwner = request.userIdentity!;
      // extra strict validation for anonymous accounts
      if (jobOwner.type === "anonymous") {
        const parseResults = UnconnectedJobInputSchema.safeParse(body);
        if (!parseResults.success) {
          return { status: 400, body: { message: parseResults.error.message } };
        }
        body = parseResults.data;
      }
      const job = await JobService.createJob(body, jobOwner);

      return { status: 202, body: job };
    },
    hooks: {
      onRequest: (req, ...rest) => req.server.requireAnyIdentity(req, ...rest),
    },
  },
  listJobs: {
    handler: async ({ request }) => {
      const jobOwner = request.userIdentity!;
      const jobs = await JobService.findJobsByOwner(jobOwner);
      return { status: 200, body: jobs };
    },
    hooks: {
      onRequest: (req, ...rest) => req.server.requireAnyIdentity(req, ...rest),
    },
  },
  getJobDetails: {
    handler: async ({ params, request }) => {
      const jobOwner = request.userIdentity!;
      const job = await JobService.findJobById(params.id, jobOwner);
      if (!job) {
        return { status: 404, body: { message: "Job not found" } };
      }
      return { status: 200, body: job };
    },
    hooks: {
      onRequest: (req, ...rest) => req.server.requireAnyIdentity(req, ...rest),
    },
  },
  getJobResult: {
    handler: async ({ params, request }) => {
      const jobOwner = request.userIdentity!;
      const result = await JobService.getJobResult(params.id, jobOwner);
      if (!result) {
        return { status: 404, body: { message: "Result not found" } };
      }
      return { status: 200, body: result };
    },
    hooks: {
      onRequest: (req, ...rest) => req.server.requireAnyIdentity(req, ...rest),
    },
  },
});
