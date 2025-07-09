"use client";

import { Button } from "@/components/ui/button";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

export default function GetStartedButton() {
  const { isConnected } = useAccount();

  if (isConnected) {
    return (
      <Button className="mt-4" onClick={() => alert("Get Started Clicked!")}>
        Get Started
      </Button>
    );
  }
  return <ConnectButton label="Connect Wallet to Get Started" />;
}
