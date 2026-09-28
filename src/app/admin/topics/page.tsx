import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import {
  deleteTopicAction,
  saveTopicAction,
} from "@/app/actions/admin";
import {
  ACheckbox,
  AInput,
  ATextarea,
  AdminEditor,
  RowAction,
} from "@/components/admin/admin-forms";

export const metadata: Metadata = { title: "Topics" };

export default async function AdminTopicsPage() {
  const topics = await prisma.topic.findMany({
    orderBy: { position: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      position: true,
      status: true,
      _count: { select: { quizzes: true, questions: true, scenarios: true } },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Topics</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Topics drive the bank grid on the quizzes page. Deleting one removes its
          questions and scenarios.
        </p>
      </div>

      <AdminEditor title="New topic" action={saveTopicAction} defaultOpen>{
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <AInput label="Name" name="name" required placeholder="Kubernetes" />
              <AInput
                label="Slug"
                name="slug"
                placeholder="Auto from name"
                hint="Used in the URL. Left blank, it is derived from the name."
              />
            </div>
            <ATextarea label="Description" name="description" required rows={2} />
            <div className="grid gap-4 sm:grid-cols-2">
              <AInput label="Icon" name="icon" defaultValue="Book" />
              <AInput label="Position" name="position" type="number" defaultValue={0} />
            </div>
          </div>
        }
      </AdminEditor>

      <div className="overflow-hidden rounded-xl border border-ink-700">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-ink-900">
            <tr>
              <Th>Topic</Th>
              <Th>Slug</Th>
              <Th align="right">Banks</Th>
              <Th align="right">Questions</Th>
              <Th align="right">Scenarios</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800 bg-ink-950">
            {topics.map((topic) => (
              <tr key={topic.id}>
                <Td>
                  <span className="font-medium text-white">{topic.name}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {topic.description}
                  </span>
                </Td>
                <Td>
                  <code className="font-mono text-xs text-slate-400">
                    /quizzes/{topic.slug}
                  </code>
                </Td>
                <Td align="right">{topic._count.quizzes}</Td>
                <Td align="right">{topic._count.questions}</Td>
                <Td align="right">{topic._count.scenarios}</Td>
                <Td align="right">
                  <RowAction
                    label="Delete"
                    action={deleteTopicAction}
                    fields={{ id: topic.id }}
                    confirm={`Delete "${topic.name}" and all of its content?`}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 font-medium text-slate-400 ${align === "right" ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className={`px-4 py-3 text-slate-300 ${align === "right" ? "text-right" : "text-left"}`}
    >
      {children}
    </td>
  );
}
