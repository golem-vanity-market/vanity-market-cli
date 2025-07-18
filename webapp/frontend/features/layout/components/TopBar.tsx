import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Cuboid } from "lucide-react";
import { GLMBalance } from "./GLMBalance";

export default function TopBar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center">
        <div className="mr-4 flex items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Cuboid className="h-6 w-6" />
            <span className="font-bold">Vanity Market</span>
          </Link>
          <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
            <Link
              href="/jobs"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              My Jobs
            </Link>
            <Link
              href="/jobs/new"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Create Job
            </Link>
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          <GLMBalance />
          <ConnectButton showBalance={false} />
        </div>
      </div>
    </header>
  );
}
