import { apiClient } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export default function useJobResults(jobId: string) {
  return useQuery({
    queryKey: ["jobResults", jobId],
    queryFn: async () => {
      const response = await apiClient.jobs.getJobResult({
        params: { id: jobId },
      });
      if (response.status !== 200) {
        throw new Error("Failed to fetch job results");
      }
      return response.body;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });
}
