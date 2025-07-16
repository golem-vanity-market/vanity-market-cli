import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  JobInputSchema,
  UnconnectedJobInputSchema,
  type JobInput,
} from "@contracts/job.contract";
import { toast } from "sonner";
import useCreateJob from "../hooks/useCreateJob";
import { useRouter } from "next/router";
import { useAccount } from "wagmi";
import { useKeystore } from "@/features/keystore/hooks/useKeystore";
import { KeyIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { KeystoreUnlocker } from "@/features/keystore/components/KeystoreUnlocker";

export function CreateJobForm() {
  const createJobMutation = useCreateJob();
  const router = useRouter();
  const { isConnected } = useAccount();
  const { isReady: isKeystoreReady } = useKeystore();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const activeSchema = isConnected ? JobInputSchema : UnconnectedJobInputSchema;

  const form = useForm<JobInput>({
    resolver: zodResolver(activeSchema),
    defaultValues: {
      publicKey: "",
      vanityAddressPrefix: "0x",
      budgetGlm: 1,
      processingUnit: "cpu", // "cpu" is a safe default for both states.
      numResults: 10,
      numWorkers: 3,
    },
  });

  async function onSubmit(values: JobInput) {
    await createJobMutation.mutateAsync(values, {
      onSuccess: (newJob) => {
        toast.success("Job created successfully!", {
          description: `Job ID: ${newJob.id}`,
        });
        form.reset();
        router.push(`/jobs/`);
      },
      onError: (error) => {
        toast.error("Failed to create job", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      },
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="publicKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Public Key</FormLabel>
              <div className="flex w-full items-center gap-2">
                <FormControl>
                  <Input placeholder="0x04..." {...field} />
                </FormControl>
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      disabled={!isKeystoreReady}
                      type="button"
                      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                    >
                      <KeyIcon /> Import from local keystore
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto">
                    <KeystoreUnlocker
                      onPublicKeyRetrieved={(publicKey) => {
                        field.onChange(publicKey);
                        setIsPopoverOpen(false);
                      }}
                      onClose={() => setIsPopoverOpen(false)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <FormDescription>
                Your uncompressed public key (starting with 0x04).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="vanityAddressPrefix"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vanity Prefix</FormLabel>
              <FormControl>
                <Input
                  placeholder="0xabc123"
                  {...field}
                  maxLength={!isConnected ? 8 : undefined}
                />
              </FormControl>
              <FormDescription>
                The desired prefix for your Ethereum address (e.g., 0xaa,
                0x1234).
                {!isConnected &&
                  " Connect your wallet to generate addresses with prefix longer than 6 characters."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 items-start">
          <FormField
            control={form.control}
            name="budgetGlm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Budget (GLM)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseFloat(e.target.value) || 0)
                    }
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="numResults"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Results</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value, 10) || 0)
                    }
                    max={!isConnected ? 10 : undefined}
                  />
                </FormControl>
                {!isConnected && (
                  <FormDescription>
                    Connect your wallet to generate more than 10 results
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="numWorkers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Workers</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value, 10) || 0)
                    }
                    max={!isConnected ? 3 : 10}
                  />
                </FormControl>
                {!isConnected && (
                  <FormDescription>
                    Connect your wallet to use more than 3 workers at the same
                    time
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="processingUnit"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Processing Unit</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="cpu" />
                    </FormControl>
                    <FormLabel className="font-normal">CPU</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="gpu" disabled={!isConnected} />
                    </FormControl>
                    <FormLabel className="font-normal">
                      GPU
                      {!isConnected && (
                        <span className="text-muted-foreground">
                          {" "}
                          (Connect wallet to use)
                        </span>
                      )}
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={createJobMutation.isPending}>
          {createJobMutation.isPending ? "Submitting..." : "Create Job"}
        </Button>
      </form>
    </Form>
  );
}
