import { apiClient } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  return useQuery({
    queryKey: ["auth"],
    queryFn: async () => {
      const response = await apiClient.auth.me();
      if (response.status !== 200) {
        return null;
      }
      return response.body;
    },
  });
}
