import type { NextConfig } from "next";
import { join } from "path";
import path from "node:path";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  images: { unoptimized: true },
  outputFileTracingRoot: join(__dirname, ".."), // allows us to import from the directory above (../shared)
  webpack: (config, { defaultLoaders }) => {
    config.module.rules.push({
      test: /\.(ts|tsx)$/,
      include: [path.resolve(__dirname, "../shared")],
      use: defaultLoaders.babel,
    });

    return config;
  },
};

export default nextConfig;
