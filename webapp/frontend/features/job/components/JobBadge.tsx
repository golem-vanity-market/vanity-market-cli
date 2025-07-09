import { Badge } from "@/components/ui/badge";
import type { JobDetails } from "@contracts/job.contract";

type JobStatus = JobDetails["status"];

interface JobStatusBadgeProps {
  status: JobStatus;
}

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const statusStyles: Record<
    JobStatus,
    {
      variant: "default" | "secondary" | "destructive" | "outline";
      text: string;
    }
  > = {
    pending: { variant: "outline", text: "Pending" },
    processing: { variant: "secondary", text: "Processing" },
    completed: { variant: "default", text: "Completed" },
    failed: { variant: "destructive", text: "Failed" },
    cancelled: { variant: "destructive", text: "Cancelled" },
  };

  const style = statusStyles[status] || statusStyles.pending;

  return <Badge variant={style.variant}>{style.text}</Badge>;
}
