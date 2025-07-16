import { ApiFetcherArgs, initClient, tsRestFetchApi } from "@ts-rest/core";
import { contract } from "@contracts";
import { getAnonymousSessionId } from "./anonymousSession";

const anonymousSessionHeader =
  process.env.NEXT_PUBLIC_ANONYMOUS_SESSION_ID_HEADER_NAME ||
  "vanity-session-id";

let accessToken = "";

// A promise for an in-flight token refresh. It's null if no refresh is in progress.
let refreshTokenPromise: Promise<string | null> | null = null;

export const setAccessToken = (token: string) => {
  accessToken = token;
};

export const apiClient = initClient(contract, {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  baseHeaders: {
    Authorization: () => (accessToken ? `Bearer ${accessToken}` : ""),
    [anonymousSessionHeader]: () => getAnonymousSessionId(),
  },
  credentials: "include",
  api: async (args: ApiFetcherArgs) => {
    const response = await tsRestFetchApi(args);

    if (response.status !== 401 || args.path.includes("/auth/refresh")) {
      return response;
    }
    // If we hit an unauthorized error, try to refresh our access token
    // (excluding the refresh endpoint itself of course to avoid infinite loops)

    // only one refresh call at a time
    if (!refreshTokenPromise) {
      refreshTokenPromise = (async () => {
        try {
          const refreshResponse = await apiClient.auth.refresh({ body: {} });
          if (refreshResponse.status !== 200) {
            throw new Error(`Failed to refresh access token`);
          }
          const newAccessToken = refreshResponse.body.accessToken;
          setAccessToken(newAccessToken);
          return newAccessToken;
        } catch {
          setAccessToken("");
          return null;
        } finally {
          refreshTokenPromise = null;
        }
      })();
    }
    const newAccessToken = await refreshTokenPromise;
    if (!newAccessToken) {
      // Don't retry, just return the 401
      return response;
    }

    // Retry the original request with the new token.
    const newHeaders = new Headers(args.headers);
    newHeaders.set("Authorization", `Bearer ${newAccessToken}`);
    return tsRestFetchApi({
      ...args,
      headers: Object.fromEntries(newHeaders),
    });
  },
});
