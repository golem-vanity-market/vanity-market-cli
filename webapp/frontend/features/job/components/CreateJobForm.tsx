"use client";

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
import { JobInputSchema, type JobInput } from "@contracts/job.contract";
import { toast } from "sonner";
import useCreateJob from "../hooks/useCreateJob";

export function CreateJobForm() {
  const createJobMutation = useCreateJob();

  const form = useForm<JobInput>({
    resolver: zodResolver(JobInputSchema),
    defaultValues: {
      publicKey: "",
      vanityAddressPrefix: "0x",
      budgetGlm: 10,
      processingUnit: "cpu",
      numResults: 1,
      numWorkers: 5,
    },
  });

  async function onSubmit(values: JobInput) {
    await createJobMutation.mutateAsync(values, {
      onSuccess: (newJob) => {
        toast.success("Job created successfully!", {
          description: `Job ID: ${newJob.id}`,
        });
        form.reset();
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
              <FormControl>
                <Input placeholder="0x04..." {...field} />
              </FormControl>
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
                <Input placeholder="0xdeadbeef" {...field} />
              </FormControl>
              <FormDescription>
                The desired prefix for your Ethereum address (e.g., 0xaa,
                0x1234).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
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
                  />
                </FormControl>
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
                  />
                </FormControl>
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
                      <RadioGroupItem value="gpu" />
                    </FormControl>
                    <FormLabel className="font-normal">GPU</FormLabel>
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
