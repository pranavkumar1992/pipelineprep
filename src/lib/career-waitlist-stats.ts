import "server-only";
import { prisma } from "@/lib/db";
import { isCareerToolsLive } from "@/lib/settings";

/** Career Tools waitlist counts (addendum: per feature and per source). */
export type WaitlistSummary = {
  enabled: boolean;
  total: number;
  unsubscribed: number;
  byFeature: Array<{ key: string; label: string; count: number }>;
  bySource: Array<{ source: string; count: number }>;
  events: Array<{ type: string; count: number }>;
  conversionPct: number | null;
  recent: Array<{
    email: string;
    features: string[];
    source: string;
    createdAt: Date;
    unsubscribedAt: Date | null;
  }>;
};

const FEATURE_LABELS: Record<string, string> = {
  RESUME_MAKER: "ATS-Friendly Resume Maker",
  JD_MATCH: "Job Description Match",
  AI_REVIEW: "AI Resume Review",
};

export async function getWaitlistSummary(): Promise<WaitlistSummary> {
  // Same precedence as the teaser itself: environment first, database second.
  const enabled = await isCareerToolsLive();

  if (!enabled) {
    return {
      enabled: false,
      total: 0,
      unsubscribed: 0,
      byFeature: [],
      bySource: [],
      events: [],
      conversionPct: null,
      recent: [],
    };
  }

  const [rows, events] = await Promise.all([
    prisma.careerWaitlist.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        email: true,
        features: true,
        source: true,
        createdAt: true,
        unsubscribedAt: true,
      },
    }),
    prisma.careerTeaserEvent.groupBy({
      by: ["type"],
      _count: { _all: true },
    }),
  ]);

  const all = await prisma.careerWaitlist.findMany({
    select: { features: true, source: true, unsubscribedAt: true },
  });

  const featureCounts: Record<string, number> = {};
  const sourceCounts: Record<string, number> = {};
  let unsubscribed = 0;

  for (const row of all) {
    for (const feature of row.features) {
      featureCounts[feature] = (featureCounts[feature] ?? 0) + 1;
    }
    sourceCounts[row.source] = (sourceCounts[row.source] ?? 0) + 1;
    if (row.unsubscribedAt) unsubscribed += 1;
  }

  const views = events.find((e) => e.type === "TEASER_VIEWED")?._count._all ?? 0;
  const clicks = events.find((e) => e.type === "NOTIFY_CLICKED")?._count._all ?? 0;

  return {
    enabled: true,
    total: all.length,
    unsubscribed,
    byFeature: Object.entries(FEATURE_LABELS).map(([key, label]) => ({
      key,
      label,
      count: featureCounts[key] ?? 0,
    })),
    bySource: Object.entries(sourceCounts).map(([source, count]) => ({
      source,
      count,
    })),
    events: events.map((e) => ({ type: e.type, count: e._count._all })),
    conversionPct: views > 0 ? Math.round((clicks / views) * 100) : null,
    recent: rows,
  };
}
