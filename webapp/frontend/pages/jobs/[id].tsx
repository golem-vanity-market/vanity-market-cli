import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Skeleton } from "@/components/ui/skeleton";
import { JobDetails } from "@/features/job/components/JobDetails";

export async function getStaticPaths() {
  return {
    paths: [], // No paths are pre-rendered
    fallback: false, // Any request for a path not in `paths` will result in a 404
  };
}

export async function getStaticProps() {
  return {
    props: {},
  };
}

export default function JobDetailsPage() {
  const router = useRouter();
  const { id } = router.query;

  if (router.isFallback || !id) {
    return (
      <main className="container mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <Skeleton className="h-96 w-full" />
      </main>
    );
  }

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
        <JobDetails jobId={Array.isArray(id) ? id[0] : id} />
      </main>
    </>
  );
}
