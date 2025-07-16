import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, LoaderIcon } from "lucide-react";
import useJobs from "../hooks/useJobs";
import { JobStatusBadge } from "./JobBadge";

export function JobsList() {
  const { data: jobs, isPending, isFetching, isError, error } = useJobs();

  if (isPending) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Could not fetch jobs: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <span className="text-lg font-semibold">No Jobs Created Yet</span>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table className={isFetching ? "opacity-60 transition-opacity" : ""}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[280px]">
              <div className="flex items-center gap-2">
                Job ID
                {isFetching && <LoaderIcon className="h-4 w-4 animate-spin" />}
              </div>
            </TableHead>
            <TableHead>Prefix</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Budget (GLM)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/jobs/${job.id}`}
                  className="text-primary hover:underline"
                >
                  {job.id}
                </Link>
              </TableCell>
              <TableCell>{job.vanityAddressPrefix}</TableCell>
              <TableCell>
                <JobStatusBadge status={job.status} />
              </TableCell>
              <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
              <TableCell className="text-right">{job.budgetGlm}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
