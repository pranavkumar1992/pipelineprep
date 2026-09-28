import type { Metadata } from "next";
import Link from "next/link";
import { getWaitlistSummary } from "@/lib/career-waitlist-stats";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Career Tools waitlist" };

/**
 * Waitlist analytics (addendum): counts per feature, per source, and the
 * teaser-to-signup funnel. No resume content exists to display here because
 * none is ever collected.
 */
export default async function CareerWaitlistPage() {
  const summary = await getWaitlistSummary();

  if (!summary.enabled) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Career Tools waitlist
        </h1>
        <div className="rounded-xl border border-ink-700 bg-ink-900 p-6">
          <p className="text-sm text-slate-300">
            The Career Tools teaser is switched off.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Set{" "}
            <code className="font-mono text-brand-400">
              CAREER_TOOLS_ENABLED=true
            </code>{" "}
            to show the teaser, the landing page and the waitlist form. While it
            is off, <code className="font-mono">/career-tools</code> returns 404
            and no waitlist events are recorded.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            No resume content is collected, uploaded or processed at any stage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Career Tools waitlist
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Interest only. Email addresses and feature preferences, nothing else.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Total signups" value={String(summary.total)} />
        <Metric label="Unsubscribed" value={String(summary.unsubscribed)} />
        <Metric
          label="Teaser to signup"
          value={
            summary.conversionPct === null ? "—" : `${summary.conversionPct}%`
          }
          hint="notify_clicked / teaser_viewed"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-ink-700 bg-ink-900 p-5">
          <h2 className="font-semibold text-white">By feature</h2>
          <ul className="mt-4 space-y-2">
            {summary.byFeature.map((feature) => (
              <li
                key={feature.key}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-slate-300">{feature.label}</span>
                <span className="font-mono text-slate-400">{feature.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-ink-700 bg-ink-900 p-5">
          <h2 className="font-semibold text-white">By source</h2>
          {summary.bySource.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No signups yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {summary.bySource.map((row) => (
                <li
                  key={row.source}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-slate-300">{row.source.toLowerCase()}</span>
                  <span className="font-mono text-slate-400">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-ink-700 bg-ink-900 p-5">
        <h2 className="font-semibold text-white">Recent signups</h2>
        {summary.recent.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No signups yet.</p>
        ) : (
          <div className="pp-scroll-x mt-4">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-700">
                  {["Email", "Features", "Source", "Joined"].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-3 py-2.5 text-left font-medium text-slate-400"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {summary.recent.map((row) => (
                  <tr key={row.email}>
                    <td className="px-3 py-3 font-mono text-xs text-slate-300">
                      {row.email}
                      {row.unsubscribedAt ? (
                        <span className="ml-2 rounded border border-ink-600 px-1 py-0.5 text-[10px] uppercase text-slate-500">
                          unsub
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400">
                      {row.features.join(", ")}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400">
                      {row.source.toLowerCase()}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">
                      {formatDate(row.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 p-5">
      <p className="font-mono text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-bold text-white">{value}</p>
      {hint ? (
        <p className="mt-1.5 font-mono text-[11px] text-slate-600">{hint}</p>
      ) : null}
    </div>
  );
}
