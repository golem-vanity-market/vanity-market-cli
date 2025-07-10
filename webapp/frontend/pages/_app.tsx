import "../globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { polygon } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import AuthWrapper from "@/features/auth/components/AuthWrapper";
import { AppProps } from "next/app";
import { Toaster } from "@/components/ui/sonner";
import AppLayout from "@/features/layout/components/AppLayout";

const queryClient = new QueryClient();

const config = getDefaultConfig({
  appName: "Golem Vanity Market",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
  chains: [polygon],
  ssr: false,
});

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AuthWrapper>
          <RainbowKitProvider>
            <AppLayout>
              <Component {...pageProps} />
            </AppLayout>
            <Toaster />
          </RainbowKitProvider>
        </AuthWrapper>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
