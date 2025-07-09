export default function JobPage() {
  return <div>Job page</div>;
}

export async function generateStaticParams() {
  return [{ id: "example" }];
}
