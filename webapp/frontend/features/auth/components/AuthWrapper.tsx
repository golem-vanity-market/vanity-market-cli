import { useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  createAuthenticationAdapter,
  RainbowKitAuthenticationProvider,
} from "@rainbow-me/rainbowkit";
import { apiClient, setAccessToken } from "@/lib/api";
import { createSiweMessage } from "viem/siwe";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";

export default function AuthWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: user, isLoading, refetch } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { address: connectedWalletAddress, isDisconnected } = useAccount();

  const handleSignOut = useCallback(async () => {
    try {
      await apiClient.auth.logout({ body: {} });
    } catch (error) {
      console.error("Backend logout failed", error);
    } finally {
      setAccessToken("");
      await queryClient.cancelQueries();
      queryClient.clear();
      router.push("/");
    }
  }, [queryClient, router]);

  // Synchronize wallet connect state with auth state
  useEffect(() => {
    if (user) {
      // We are logged in but no wallet connection
      if (isDisconnected) {
        console.log("Wallet disconnected, forcing application logout.");
        handleSignOut();
        return; // Exit early
      }
      // We are logged in but connected with a different wallet
      if (
        user.address &&
        connectedWalletAddress &&
        user.address.toLowerCase() !== connectedWalletAddress.toLowerCase()
      ) {
        console.log("Wallet account changed, forcing application logout.");
        handleSignOut();
      }
    }
  }, [user, connectedWalletAddress, isDisconnected, handleSignOut]);

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
        await handleSignOut();
      },
    });
  }, [refetch, handleSignOut]);

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
