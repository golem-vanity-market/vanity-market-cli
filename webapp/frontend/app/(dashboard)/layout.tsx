export default function JobsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <main className="flex flex-grow p-8">{children}</main>
    </div>
  );
}
