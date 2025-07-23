import { initServer } from "@ts-rest/fastify";
import { contract } from "../../../../shared/contracts/index.ts";
import { UnconnectedJobInputSchema } from "../../../../shared/contracts/job.contract.ts";

const s = initServer();

export const jobRouter = s.router(contract.jobs, {
  createJob: {
    handler: async ({ body, request: { userIdentity, jobService } }) => {
      const jobOwner = userIdentity!;
      // extra strict validation for anonymous accounts
      if (jobOwner.type === "anonymous") {
        const parseResults = UnconnectedJobInputSchema.safeParse(body);
        if (!parseResults.success) {
          return { status: 400, body: { message: parseResults.error.message } };
        }
        body = parseResults.data;
      }
      const job = await jobService.createJob(body, jobOwner);

      return { status: 202, body: job };
    },
    hooks: {
      onRequest: (req, ...rest) => req.server.requireAnyIdentity(req, ...rest),
    },
  },
  listJobs: {
    handler: async ({ request: { jobService, userIdentity } }) => {
      const jobOwner = userIdentity!;
      const jobs = await jobService.findJobsByOwner(jobOwner);
      return { status: 200, body: jobs };
    },
    hooks: {
      onRequest: (req, ...rest) => req.server.requireAnyIdentity(req, ...rest),
    },
  },
  getJobDetails: {
    handler: async ({ params, request: { jobService, userIdentity } }) => {
      const jobOwner = userIdentity!;
      const job = await jobService.findJobById(params.id, jobOwner);
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
    handler: async ({ params, request: { jobService, userIdentity } }) => {
      const jobOwner = userIdentity!;
      const result = await jobService.getJobResult(params.id, jobOwner);
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
