import { Button } from "@/components/ui/button";
import { JobDetails } from "@/features/job/components/JobDetails";

import { JobsList } from "@/features/job/components/JobList";
import { ChevronLeft, PlusCircle } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";

function JobDetailsPage({ jobId }: { jobId: string }) {
  const router = useRouter();
  const { id } = router.query;

  return (
    <>
      <Head>
        <title>{`Job Details - ${id}`}</title>
      </Head>
      <main className="container mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <div>
          <Button asChild variant="outline" size="sm">
            <Link href="/jobs">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to All Jobs
            </Link>
          </Button>
        </div>
        <JobDetails jobId={jobId} />
      </main>
    </>
  );
}

export default function JobsPage() {
  const router = useRouter();
  const { id } = router.query;

  if (!router.isFallback && id) {
    return <JobDetailsPage jobId={Array.isArray(id) ? id[0] : id} />;
  }

  return (
    <>
      <Head>
        <title>My Jobs - Vanity Market</title>
        <meta
          name="description"
          content="View and monitor your vanity address generation jobs."
        />
      </Head>
      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Jobs</h1>
            <p className="text-muted-foreground">
              {`Here's a list of all your submitted jobs and their current status.`}
            </p>
          </div>
          <Button asChild>
            <Link href="/jobs/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Job
            </Link>
          </Button>
        </div>

        <JobsList />
      </div>
    </>
  );
}
