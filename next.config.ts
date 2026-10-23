import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/tools/:path*",
        destination: "/lab/:path*",
        permanent: true,
      },
      {
        source: "/:lang(en-US|ru-RU|ja-JP|ko-KR|zh-CN|zh-TW)/tools/:path*",
        destination: "/:lang/lab/:path*",
        permanent: true,
      },
    ];
  },
  experimental: {
    globalNotFound: true,
    turbopackUseSystemTlsCerts: true,
  },
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/sharp/**/*",
      "./node_modules/@img/sharp*/**/*",
      "./node_modules/.pnpm/@img+sharp*/**/*",
    ],
  },
};

export default nextConfig;
