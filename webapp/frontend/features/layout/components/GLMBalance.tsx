import { erc20Abi, formatEther } from "viem";
import { useReadContract } from "wagmi";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";
import { useMemo } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";

const GLM_ADDRESS = "0x0b220b82f3ea3b7f6d9a1d8ab58930c064a2b5bf";
const POLYGONSCAN_TOKEN_URL = `https://polygonscan.com/token/${GLM_ADDRESS}`;

export function GLMBalance() {
  const { data: user } = useAuth();
  const isConnected = !!user;
  const address = isConnected ? user.address : undefined;

  const { data: balance, isLoading } = useReadContract({
    address: GLM_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: isConnected,
      refetchInterval: 30_000,
    },
  });

  const { formattedBalance, fullBalance } = useMemo(() => {
    if (typeof balance !== "bigint") {
      return { formattedBalance: null, fullBalance: null };
    }

    const balanceInEth = formatEther(balance);
    const balanceNum = parseFloat(balanceInEth);

    const compactFormatted = new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(balanceNum);

    return {
      formattedBalance: compactFormatted,
      fullBalance: balanceInEth,
    };
  }, [balance]);

  if (!isConnected) {
    return null;
  }

  if (isLoading || formattedBalance === null) {
    return <Skeleton className="h-6 w-24 rounded-md" />;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={`${POLYGONSCAN_TOKEN_URL}?a=${address}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="flex cursor-pointer items-center gap-2 py-1.5 px-2">
              <Image
                src="/glm-token.svg"
                alt="GLM token"
                width={28}
                height={28}
                className="h-7 w-7"
              />
              <span className="font-semibold tabular-nums tracking-tight leading-[normal]">
                {formattedBalance}
              </span>
              <span className="font-normal text-muted-foreground leading-[normal]">
                GLM
              </span>
            </div>
          </a>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="p-3">
          <div className="flex flex-col gap-2 text-sm">
            <p className="font-bold">Golem Network Token</p>
            <p>
              <span className="font-medium ">Balance:</span> {fullBalance} GLM
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
