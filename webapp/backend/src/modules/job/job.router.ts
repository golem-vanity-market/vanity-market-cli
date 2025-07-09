import { initServer } from "@ts-rest/fastify";
import { contract } from "../../../../shared/contracts/index.ts";
import * as JobService from "./job.service.ts";

const s = initServer();

export const jobRouter = s.router(contract.jobs, {
  createJob: {
    handler: async ({ body, request }) => {
      const user = request.user;
      const job = await JobService.createJob(body, user.walletAddress);

      return { status: 202, body: job };
    },
    hooks: {
      onRequest: (req, ...rest) => req.server.authenticate(req, ...rest),
    },
  },
  listJobs: {
    handler: async ({ request }) => {
      const user = request.user;
      const jobs = await JobService.findJobsByUserId(user.walletAddress);
      return { status: 200, body: jobs };
    },
    hooks: {
      onRequest: (req, ...rest) => req.server.authenticate(req, ...rest),
    },
  },
  getJobDetails: {
    handler: async ({ params, request }) => {
      const job = await JobService.findJobById(
        params.id,
        request.user.walletAddress
      );
      if (!job) {
        return { status: 404, body: { message: "Job not found" } };
      }
      return { status: 200, body: job };
    },
    hooks: {
      onRequest: (req, ...rest) => req.server.authenticate(req, ...rest),
    },
  },
  getJobResult: {
    handler: async ({ params, request }) => {
      const result = await JobService.getJobResult(
        params.id,
        request.user.walletAddress
      );
      if (!result) {
        return { status: 404, body: { message: "Result not found" } };
      }
      return { status: 200, body: result };
    },
    hooks: {
      onRequest: (req, ...rest) => req.server.authenticate(req, ...rest),
    },
  },
});
