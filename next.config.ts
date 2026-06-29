import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/sharp/**/*",
      "./node_modules/@img/sharp*/**/*",
      "./node_modules/.pnpm/@img+sharp*/**/*",
    ],
  },
};

export default nextConfig;
