import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

/**
 * Sitemap (M-7).
 *
 * Public marketing, legal and scenario pages are listed. The quiz bank grid is
 * indexable but individual banks are per-user (progress and locks), so they are
 * deliberately excluded rather than listed and then redirecting to a sign-in.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl();
  const now = new Date();

  const entries: Entry[] = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/quizzes`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/scenarios`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/refund`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/shipping`, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const scenarios = await prisma.scenario.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    });

    for (const scenario of scenarios) {
      entries.push({
        url: `${base}/scenarios/${scenario.slug}`,
        lastModified: scenario.updatedAt,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch (error) {
    // A missing database must not break the sitemap endpoint.
    console.error("[sitemap] scenarios unavailable:", error);
  }

  return entries;
}
