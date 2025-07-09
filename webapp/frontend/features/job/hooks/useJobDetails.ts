import { apiClient } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export default function useJobDetails(jobId: string) {
  return useQuery({
    queryKey: ["jobDetails", jobId],
    queryFn: async () => {
      const response = await apiClient.jobs.getJobDetails({
        params: { id: jobId },
      });
      if (response.status !== 200) {
        throw new Error("Failed to fetch job details");
      }
      return response.body;
    },
  });
}
