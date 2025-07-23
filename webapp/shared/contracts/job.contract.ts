import { initContract } from "@ts-rest/core";
import * as z from "zod/v4";

const c = initContract();

export const JobInputSchema = z.object({
  publicKey: z.string(),
  vanityAddressPrefix: z.string(),
  budgetGlm: z.number().positive(),
  processingUnit: z.enum(["cpu", "gpu"]),
  numResults: z.number().int().positive(),
  numWorkers: z.number().int().positive(),
});

/**
 * Stricter schema for requesting jobs without having a wallet connected
 */
export const UnconnectedJobInputSchema = JobInputSchema.extend({
  processingUnit: z.literal("cpu", {
    message: "Only CPU is available for not connected users.",
  }),
  // max 8 = "0x" + 6 user selected
  vanityAddressPrefix: JobInputSchema.shape.vanityAddressPrefix.max(8, {
    message: "Prefix can be a maximum of 6 characters for not connected users.",
  }),
  numWorkers: JobInputSchema.shape.numWorkers.max(3, {
    message: "Maximum of 3 workers for not connected users.",
  }),
  numResults: JobInputSchema.shape.numResults.max(10, {
    message: "Maximum of 10 results for not connected users.",
  }),
});

export const JobSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "processing", "completed", "failed", "cancelled"]),
  publicKey: z.string(),
  vanityAddressPrefix: z.string(),
  numWorkers: z.number().int().positive(),
  budgetGlm: z.number().positive(),
  processingUnit: z.enum(["cpu", "gpu"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const JobResultSchema = z.array(
  z.object({
    addr: z.string(),
    salt: z.string(),
    pubKey: z.string(),
    provider: z.object({
      id: z.string(),
      name: z.string(),
      walletAddress: z.string(),
    }),
  })
);

export type JobInput = z.infer<typeof JobInputSchema>;
export type JobDetails = z.infer<typeof JobSchema>;
export type JobResult = z.infer<typeof JobResultSchema>;

export const jobsContract = c.router({
  createJob: {
    method: "POST",
    path: "/jobs",
    body: JobInputSchema,
    responses: {
      202: JobSchema,
      400: z.object({ message: z.string() }),
    },
    summary: "Create a new long-running job",
  },
  listJobs: {
    method: "GET",
    path: "/jobs",
    responses: {
      200: z.array(JobSchema),
    },
    summary: "List all jobs for the current user",
  },
  getJobDetails: {
    method: "GET",
    path: "/jobs/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: JobSchema,
      404: z.object({ message: z.string() }),
    },
    summary: "Get the status and details of a specific job",
  },
  getJobResult: {
    method: "GET",
    path: "/jobs/:id/result",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: JobResultSchema,
      404: z.object({ message: z.string() }),
    },
    summary: "Fetch the result of a completed job",
  },
});
