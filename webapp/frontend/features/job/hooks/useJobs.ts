import { apiClient } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export default function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const response = await apiClient.jobs.listJobs();
      if (response.status !== 200) {
        throw new Error("Failed to fetch jobs");
      }
      return response.body;
    },
    refetchInterval: 5000,
  });
}
