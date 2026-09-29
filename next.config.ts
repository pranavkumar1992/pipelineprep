import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /*
   * Standalone output emits a self-contained server plus only the node_modules
   * actually imported at runtime. The Dockerfile copies `.next/standalone` into
   * the final stage, so without this the image build fails at that COPY — and it
   * fails silently in local `next build`, which still succeeds without it.
   *
   * `next start` and `next dev` are unaffected.
   */
  output: "standalone",

  serverExternalPackages: ["bcryptjs", "nodemailer", "razorpay", "papaparse", "pg"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
