import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = env.siteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Personal and transactional areas must never be indexed.
        disallow: [
          "/api/",
          "/dashboard",
          "/admin",
          "/login",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/checkout",
          "/*?next=",
          "/*?plan=",
          "/*?coupon=",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
