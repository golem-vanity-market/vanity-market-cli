import { initServer } from "@ts-rest/fastify";
import { contract } from "../../../../shared/contracts/index.ts";
import { UnconnectedJobInputSchema } from "../../../../shared/contracts/job.contract.ts";
import type { JobService } from "../../types.ts";

export const createJobRouter = (s: ReturnType<typeof initServer>, jobService: JobService) => {
  return s.router(contract.jobs, {
    createJob: {
      handler: async ({ body, request }) => {
        const jobOwner = request.userIdentity!;
        // extra strict validation for anonymous accounts
        if (jobOwner.type === "anonymous") {
          const parseResults = UnconnectedJobInputSchema.safeParse(body);
          if (!parseResults.success) {
            return {
              status: 400,
              body: { message: parseResults.error.message },
            };
          }
          body = parseResults.data;
        }
        const job = await jobService.createJob(body, jobOwner);

        return { status: 202, body: job };
      },
      hooks: {
        onRequest: (req, ...rest) =>
          req.server.requireAnyIdentity(req, ...rest),
      },
    },
    listJobs: {
      handler: async ({ request }) => {
        const jobOwner = request.userIdentity!;
        const jobs = await jobService.findJobsByOwner(jobOwner);
        return { status: 200, body: jobs };
      },
      hooks: {
        onRequest: (req, ...rest) =>
          req.server.requireAnyIdentity(req, ...rest),
      },
    },
    getJobDetails: {
      handler: async ({ params, request }) => {
        const jobOwner = request.userIdentity!;
        const job = await jobService.findJobById(params.id, jobOwner);
        if (!job) {
          return { status: 404, body: { message: "Job not found" } };
        }
        return { status: 200, body: job };
      },
      hooks: {
        onRequest: (req, ...rest) =>
          req.server.requireAnyIdentity(req, ...rest),
      },
    },
    getJobResult: {
      handler: async ({ params, request }) => {
        const jobOwner = request.userIdentity!;
        const result = await jobService.getJobResult(params.id, jobOwner);
        if (!result) {
          return { status: 404, body: { message: "Result not found" } };
        }
        return { status: 200, body: result };
      },
      hooks: {
        onRequest: (req, ...rest) =>
          req.server.requireAnyIdentity(req, ...rest),
      },
    },
  });
};
