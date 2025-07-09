import TopBar from "./TopBar";
import Footer from "./Footer";

import { Geist, Geist_Mono } from "next/font/google";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div
      className={`flex min-h-screen flex-col bg-slate-50  ${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
    >
      <TopBar />
      <main className="container mx-auto flex-grow p-4 md:p-8">{children}</main>
      <Footer />
    </div>
  );
}
