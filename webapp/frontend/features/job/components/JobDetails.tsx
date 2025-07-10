// components/jobs/job-details.tsx
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { JobStatusBadge } from "./JobBadge";
import useJobResults from "../hooks/useJobResults";
import useJobDetails from "../hooks/useJobDetails";
import { toast } from "sonner";

interface JobDetailsProps {
  jobId: string;
}

function JobDetailItem({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

export function JobDetails({ jobId }: JobDetailsProps) {
  const {
    data: job,
    isLoading: isLoadingDetails,
    isError: isErrorDetails,
    error: errorDetails,
  } = useJobDetails(jobId);

  const {
    data: results,
    isLoading: isLoadingResults,
    isError: isErrorResults,
    error: errorResults,
  } = useJobResults(jobId);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast("Copied to Clipboard");
  };

  if (isLoadingDetails) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (isErrorDetails) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Job</AlertTitle>
        <AlertDescription>{errorDetails?.message}</AlertDescription>
      </Alert>
    );
  }

  if (!job) {
    return <div>Job not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Job Details</CardTitle>
              <CardDescription className="pt-1 font-mono">
                {job.id}
              </CardDescription>
            </div>
            <JobStatusBadge status={job.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <JobDetailItem label="Prefix" value={job.vanityAddressPrefix} />
          <JobDetailItem label="Budget (GLM)" value={job.budgetGlm} />
          <JobDetailItem label="Workers" value={job.numWorkers} />
          <JobDetailItem
            label="Processing Unit"
            value={job.processingUnit.toUpperCase()}
          />
          <JobDetailItem
            label="Created At"
            value={new Date(job.createdAt).toLocaleString()}
          />
          <JobDetailItem
            label="Last Updated"
            value={new Date(job.updatedAt).toLocaleString()}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            Results
          </CardTitle>
          <CardDescription>
            Found vanity addresses matching your criteria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingResults && <Skeleton className="h-24 w-full" />}
          {isErrorResults && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Results</AlertTitle>
              <AlertDescription>{errorResults?.message}</AlertDescription>
            </Alert>
          )}
          {results && results.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>Salt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.addr}>
                      <TableCell
                        className="font-mono hover:cursor-pointer"
                        onClick={() => copyToClipboard(result.addr)}
                      >
                        {result.addr}
                      </TableCell>
                      <TableCell
                        className="font-mono hover:cursor-pointer"
                        onClick={() => copyToClipboard(result.salt)}
                      >
                        {result.salt.slice(0, 20)}...
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {results &&
            results.length === 0 &&
            !isLoadingResults &&
            !isErrorResults && (
              <div className="text-center text-muted-foreground py-8">
                No results found yet.
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
