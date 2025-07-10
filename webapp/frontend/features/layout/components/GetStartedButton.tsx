import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useAccount } from "wagmi";

export default function GetStartedButton() {
  const { data: user } = useAuth();
  const { isConnected } = useAccount();

  const isConnectedAndAuthenticated = isConnected && !!user;

  if (isConnectedAndAuthenticated) {
    return (
      <Button className="mt-4" asChild>
        <Link href="/jobs">Get Started</Link>
      </Button>
    );
  }
  return <ConnectButton label="Connect Wallet to Get Started" />;
}
