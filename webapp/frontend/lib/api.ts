import { ApiFetcherArgs, initClient, tsRestFetchApi } from "@ts-rest/core";
import { contract } from "@contracts";

let accessToken = "";
// A flag to prevent infinite refresh loops
let isRefreshing = false;

export const setAccessToken = (token: string) => {
  accessToken = token;
};

export const apiClient = initClient(contract, {
  baseUrl: "http://localhost:3001",
  baseHeaders: {
    Authorization: () => (accessToken ? `Bearer ${accessToken}` : ""),
  },
  credentials: "include",
  api: async (args: ApiFetcherArgs) => {
    const response = await tsRestFetchApi(args);
    // Check if the request failed with a 401 Unauthorized error
    if (response.status === 401 && !isRefreshing) {
      isRefreshing = true;
      try {
        // Attempt to refresh the token
        const refreshResponse = await apiClient.auth.refresh({ body: {} });

        if (refreshResponse.status === 200) {
          setAccessToken(refreshResponse.body.accessToken);
          // Retry the original request with the new token
          const newHeaders = new Headers(args.headers);
          newHeaders.set(
            "Authorization",
            `Bearer ${refreshResponse.body.accessToken}`
          );
          return tsRestFetchApi({
            ...args,
            headers: Object.fromEntries(newHeaders),
          });
        }
      } catch {
        setAccessToken("");
      } finally {
        isRefreshing = false;
      }
    }
    return response;
  },
});
