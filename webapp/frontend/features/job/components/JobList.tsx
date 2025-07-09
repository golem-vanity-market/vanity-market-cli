"use client";

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
import { AlertTriangle } from "lucide-react";
import useJobs from "../hooks/useJobs";
import { JobStatusBadge } from "./JobBadge";

export function JobsList() {
  const { data: jobs, isLoading, isError, error } = useJobs();

  if (isLoading) {
    return (
      <div className="space-y-2">
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

  if (!jobs || jobs.length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        {`You haven't created any jobs yet.`}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[280px]">Job ID</TableHead>
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
