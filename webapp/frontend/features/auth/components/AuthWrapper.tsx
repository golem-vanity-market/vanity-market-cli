import { useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  createAuthenticationAdapter,
  RainbowKitAuthenticationProvider,
} from "@rainbow-me/rainbowkit";
import { apiClient, setAccessToken } from "@/lib/api";
import { createSiweMessage } from "viem/siwe";

export default function AuthWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: user, isLoading, refetch } = useAuth();

  const authAdapter = useMemo(() => {
    return createAuthenticationAdapter({
      getNonce: async () => {
        const response = await apiClient.auth.getNonce({ body: {} });
        if (response.status !== 200) {
          throw new Error("Failed to fetch nonce");
        }
        return response.body.nonce;
      },

      createMessage: ({ nonce, address, chainId }) => {
        return createSiweMessage({
          domain: window.location.host,
          address,
          statement: "Sign in to Golem Vanity Market",
          uri: window.location.origin,
          version: "1",
          chainId,
          nonce,
        });
      },

      verify: async ({ message, signature }) => {
        try {
          const response = await apiClient.auth.signIn({
            body: {
              message,
              signature: signature as `0x${string}`,
            },
          });

          if (response.status !== 200) {
            return false;
          }

          setAccessToken(response.body.accessToken);
          await refetch();
          return true;
        } catch (error) {
          console.error("Verification failed", error);
          return false;
        }
      },

      signOut: async () => {
        try {
          await apiClient.auth.logout({ body: {} });
        } catch (error) {
          console.error("Logout failed", error);
        } finally {
          setAccessToken("");
          await refetch();
        }
      },
    });
  }, [refetch]);

  const authState = !!user
    ? "authenticated"
    : isLoading
    ? "loading"
    : "unauthenticated";

  return (
    <RainbowKitAuthenticationProvider adapter={authAdapter} status={authState}>
      {children}
    </RainbowKitAuthenticationProvider>
  );
}
