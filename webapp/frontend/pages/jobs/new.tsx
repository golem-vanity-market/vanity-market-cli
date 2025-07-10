// pages/jobs/new.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateJobForm } from "@/features/job/components/CreateJobForm";
import Head from "next/head";

export default function NewJobPage() {
  return (
    <>
      <Head>
        <title>Create New Job - Vanity Market</title>
        <meta
          name="description"
          content="Start a new vanity address generation job."
        />
      </Head>
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Create a New Job</CardTitle>
            <CardDescription>
              Fill out the form below to start searching for a vanity address.
              {`Your job will appear on the 'My Jobs' dashboard.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateJobForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
