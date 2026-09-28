import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getPerformanceData } from "@/lib/performance";
import { formatDuration, relativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Performance",
  robots: { index: false, follow: false },
};

export default async function PerformancePage() {
  const user = await requireUser("/dashboard/performance");
  const data = await getPerformanceData();

  const isEmpty = data.overall.answered === 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <nav className="mb-6 text-sm">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-300">
          Dashboard
        </Link>
        <span aria-hidden="true" className="mx-2 text-slate-700">
          /
        </span>
        <span className="text-slate-400">Performance</span>
      </nav>

      <h1 className="text-3xl font-bold tracking-tight text-white">Performance</h1>
      <p className="mt-2 text-sm text-slate-400">
        Accuracy by topic, where you are weakest, and how your scores move over
        time.
      </p>

      {isEmpty ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink-600 py-20 text-center">
          <p className="text-slate-400">
            No attempts yet, try your first quiz!
          </p>
          <Link
            href="/quizzes"
            className="mt-5 inline-flex h-11 items-center rounded-lg bg-brand-400 px-5 text-sm font-semibold text-ink-950 transition-colors hover:bg-brand-500"
          >
            Browse quizzes
          </Link>
        </div>
      ) : (
        <>
          {/* Headline numbers */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label="Questions answered" value={String(data.overall.answered)} />
            <Tile
              label="Overall accuracy"
              value={
                data.overall.accuracyPct === null
                  ? "—"
                  : `${data.overall.accuracyPct}%`
              }
            />
            <Tile label="Mastered" value={String(data.overall.mastered)} />
            <Tile
              label="Time spent"
              value={data.timeSpentSec > 0 ? formatDuration(data.timeSpentSec) : "—"}
            />
          </div>

          {/* Score trend */}
          <section aria-labelledby="trend" className="mt-10">
            <h2
              id="trend"
              className="font-mono text-xs uppercase tracking-wider text-slate-500"
            >
              Score trend
            </h2>
            {data.trend.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">
                Complete an attempt to start the trend.
              </p>
            ) : (
              <div className="mt-4 rounded-2xl border border-ink-700 bg-ink-900 p-6">
                <TrendChart points={data.trend.map((p) => p.percentage)} />
                <ol className="mt-4 space-y-1.5">
                  {data.trend
                    .slice(-5)
                    .reverse()
                    .map((point, index) => (
                      <li
                        key={`${point.when.toISOString()}-${index}`}
                        className="flex items-center justify-between gap-3 font-mono text-xs text-slate-500"
                      >
                        <span className="truncate">{point.title}</span>
                        <span className="shrink-0 text-slate-300">
                          {point.percentage}% &middot; {relativeTime(point.when)}
                        </span>
                      </li>
                    ))}
                </ol>
              </div>
            )}
          </section>

          {/* Accuracy by topic */}
          <section aria-labelledby="by-topic" className="mt-10">
            <h2
              id="by-topic"
              className="font-mono text-xs uppercase tracking-wider text-slate-500"
            >
              Accuracy by topic
            </h2>
            {data.byTopic.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">
                Answer questions in a few topics to see the breakdown.
              </p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {[...data.byTopic]
                  .sort((a, b) => b.accuracyPct - a.accuracyPct)
                  .map((topic) => (
                    <li
                      key={topic.slug}
                      className="rounded-xl border border-ink-700 bg-ink-900 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Link
                          href="/quizzes"
                          className="text-sm font-medium text-white hover:text-brand-400"
                        >
                          {topic.name}
                        </Link>
                        <span className="font-mono text-xs text-slate-400">
                          {topic.accuracyPct}% &middot; {topic.correct}/{topic.answered}
                        </span>
                      </div>
                      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-ink-800">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            topic.accuracyPct >= 80
                              ? "bg-mint-400"
                              : topic.accuracyPct >= 60
                                ? "bg-brand-400"
                                : topic.accuracyPct >= 40
                                  ? "bg-amber-450"
                                  : "bg-rose-450",
                          )}
                          style={{ width: `${topic.accuracyPct}%` }}
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          {/* Weak areas */}
          <section aria-labelledby="weak" className="mt-10">
            <h2
              id="weak"
              className="font-mono text-xs uppercase tracking-wider text-slate-500"
            >
              Weak areas
            </h2>
            {data.weakAreas.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">
                Keep practising and this fills in automatically.
              </p>
            ) : (
              <ol className="mt-4 space-y-2">
                {data.weakAreas.map((area, index) => (
                  <li
                    key={area.slug}
                    className="flex items-center gap-4 rounded-lg border border-ink-700 bg-ink-900 px-4 py-3"
                  >
                    <span className="font-mono text-sm text-slate-500">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm text-white">{area.name}</span>
                    <span className="font-mono text-xs text-slate-400">
                      {area.accuracyPct}% over {area.answered}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Saved questions */}
          <section aria-labelledby="saved" className="mt-10">
            <h2
              id="saved"
              className="font-mono text-xs uppercase tracking-wider text-slate-500"
            >
              Saved questions
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Tile label="Bookmarked" value={String(data.overall.bookmarks)} />
              <Tile label="Marked hard" value={String(data.overall.hardMarked)} />
              <Tile label="Attempts" value={String(data.attempts)} />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Bookmarked and hard-marked questions feed Revision mode on the
              quizzes page.
            </p>
          </section>
        </>
      )}

      <p className="mt-10 text-center text-xs text-slate-600">
        Signed in as {user.email}
      </p>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 p-5">
      <p className="font-mono text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

/**
 * Minimal inline line chart. A charting dependency would add weight for one
 * sparkline; this is a plain SVG polyline with labelled axes.
 */
function TrendChart({ points }: { points: number[] }) {
  if (points.length === 0) return null;

  const width = 600;
  const height = 160;
  const padding = 8;

  // A single point has no span, so centre it rather than dividing by zero.
  const step =
    points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const coordinates = points.map((value, index) => {
    const x = padding + index * step;
    const y = height - padding - (value / 100) * (height - padding * 2);
    return [x, y] as const;
  });

  const path = coordinates
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${path} L${width - padding},${height - padding} L${padding},${height - padding} Z`;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-40 w-full"
        role="img"
        aria-label={`Score trend across ${points.length} attempts, from ${points[0]}% to ${points[points.length - 1]}%`}
      >
        {/* 50% and 100% reference lines, so the shape has context. */}
        <line
          x1={padding}
          y1={height - padding - 0.5 * (height - padding * 2)}
          x2={width - padding}
          y2={height - padding - 0.5 * (height - padding * 2)}
          stroke="currentColor"
          className="text-ink-700"
          strokeDasharray="3 4"
        />
        <path d={areaPath} className="fill-brand-400/10" />
        <path
          d={path}
          fill="none"
          strokeWidth="2"
          className="stroke-brand-400"
        />
        {coordinates.map(([x, y], index) => (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="2.5"
            className="fill-brand-400"
          />
        ))}
      </svg>
      <figcaption className="mt-2 flex justify-between font-mono text-[11px] text-slate-500">
        <span>Oldest</span>
        <span>Score percentage per attempt</span>
        <span>Latest</span>
      </figcaption>
    </figure>
  );
}
