import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function TopBar() {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-800 text-white">
      <h1 className="text-xl font-bold">Golem Vanity Market</h1>
      <ConnectButton />
    </div>
  );
}
