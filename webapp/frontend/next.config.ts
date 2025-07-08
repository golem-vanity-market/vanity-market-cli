import type { NextConfig } from "next";
import { join } from "path";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  images: { unoptimized: true },
  outputFileTracingRoot: join(__dirname, ".."), // allows us to import from the directory above (../shared)
};

export default nextConfig;
