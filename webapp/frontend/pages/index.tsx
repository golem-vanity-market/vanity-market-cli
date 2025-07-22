import GetStartedButton from "@/features/layout/components/GetStartedButton";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Golem Vanity Market",
  description: "Generate the perfect ethereum address",
};

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center flex-1">
      <h1 className="text-3xl font-bold mb-4">Golem Vanity Market</h1>
      <p className="text-lg mb-8">
        Generate unique Ethereum address with vanity address generator.
      </p>
      <GetStartedButton />
    </div>
  );
}
