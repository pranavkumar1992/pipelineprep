import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { markMessageAction } from "@/app/actions/admin";
import { RowAction } from "@/components/admin/admin-forms";
import { formatDateTime, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };

export default async function AdminMessagesPage() {
  const messages = await prisma.contactMessage.findMany({
    orderBy: [{ handled: "asc" }, { createdAt: "desc" }],
    take: 80,
  });

  const open = messages.filter((m) => !m.handled);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Contact messages
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          {open.length} unhandled.
        </p>
      </div>

      {messages.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-600 px-5 py-10 text-center text-sm text-slate-400">
          No messages yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {messages.map((message) => (
            <li
              key={message.id}
              className={`rounded-xl border p-5 ${
                message.handled
                  ? "border-ink-800 bg-ink-900/60 opacity-70"
                  : "border-ink-700 bg-ink-900"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-white">{message.subject ?? "(no subject)"}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-500">
                    {message.name} &lt;{message.email}&gt; &middot;{" "}
                    {formatDateTime(message.createdAt)} ({relativeTime(message.createdAt)})
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {message.handled ? (
                    <span className="rounded border border-ink-600 bg-ink-850 px-1.5 py-0.5 font-mono text-[10px] uppercase text-slate-500">
                      handled
                    </span>
                  ) : null}
                  <a
                    href={`mailto:${message.email}?subject=${encodeURIComponent(
                      `Re: ${message.subject ?? "Your PipelinePrep message"}`,
                    )}`}
                    className="rounded-md border border-ink-600 px-2 py-1 font-mono text-[11px] text-slate-300 hover:bg-ink-800"
                  >
                    Reply
                  </a>
                  <RowAction
                    label={message.handled ? "Reopen" : "Mark handled"}
                    action={markMessageAction}
                    fields={{ id: message.id, handled: !message.handled }}
                    variant="secondary"
                  />
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                {message.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
