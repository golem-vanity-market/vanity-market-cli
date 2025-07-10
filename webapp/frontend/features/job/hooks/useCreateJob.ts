import { apiClient } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { JobInput } from "@contracts/job.contract";

export default function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobInput: JobInput) => {
      const response = await apiClient.jobs.createJob({ body: jobInput });
      if (response.status !== 202) {
        throw new Error("Failed to create job");
      }
      return response.body;
    },
    onSuccess: (newJob) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.setQueryData(["job", newJob.id], newJob);
    },
  });
}
