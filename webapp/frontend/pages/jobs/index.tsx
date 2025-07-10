import { Button } from "@/components/ui/button";

import { JobsList } from "@/features/job/components/JobList";
import { PlusCircle } from "lucide-react";
import Head from "next/head";
import Link from "next/link";

export default function JobsPage() {
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
