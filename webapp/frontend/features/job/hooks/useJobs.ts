import { apiClient } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";

export default function useJobs() {
  const { address } = useAccount();
  return useQuery({
    queryKey: ["jobs", address || "<anonymous>"],
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
