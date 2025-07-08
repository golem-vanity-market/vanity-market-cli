"use client";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { polygon } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import TopBar from "@/features/layout/components/TopBar";
import Footer from "@/features/layout/components/Footer";
import AuthWrapper from "@/features/auth/components/AuthWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const queryClient = new QueryClient();

const config = getDefaultConfig({
  appName: "Golem Vanity Market",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
  chains: [polygon],
  ssr: false,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <AuthWrapper>
              <RainbowKitProvider>
                <div className="flex flex-col min-h-screen bg-gray-100">
                  <TopBar />
                  <main className="flex flex-grow p-8">{children}</main>
                  <Footer />
                </div>
              </RainbowKitProvider>
            </AuthWrapper>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
