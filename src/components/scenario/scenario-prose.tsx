import Link from "next/link";
import { cn } from "@/lib/utils";
import { CopyButtonClient } from "./copy-button";

export type CodeBlock = { language: string; code: string; caption?: string };

/**
 * Renders the scenario's prose fields and command blocks.
 *
 * Deliberately not a general Markdown renderer: it handles exactly the subset
 * the seed content uses (paragraphs, bullet lists, `inline code`, bold) and
 * escapes everything else, so admin-authored content cannot inject markup.
 */
export function ScenarioProse({ text }: { text: string | null | undefined }) {
  if (!text) return null;

  const blocks = text.split(/\n{2,}/);

  return (
    <div className="pp-prose text-[15px]">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        const isBulletList = trimmed
          .split("\n")
          .every((line) => line.trim().startsWith("- ") || line.trim().startsWith("* "));

        if (isBulletList) {
          return (
            <ul key={i}>
              {trimmed.split("\n").map((line, j) => (
                <li key={j}>{renderInline(line.trim().replace(/^[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }

        const isNumbered = trimmed
          .split("\n")
          .every((line) => /^\d+\.\s+/.test(line.trim()));

        if (isNumbered) {
          return (
            <ol key={i}>
              {trimmed.split("\n").map((line, j) => (
                <li key={j}>{renderInline(line.trim().replace(/^\d+\.\s+/, ""))}</li>
              ))}
            </ol>
          );
        }

        return <p key={i}>{renderInline(trimmed.replace(/\n/g, " "))}</p>;
      })}
    </div>
  );
}

/** Escapes text, then applies only the inline marks we support. */
function renderInline(text: string): React.ReactNode {
  const escaped = escapeHtml(text);

  const withCode = escaped.replace(
    /`([^`]+)`/g,
    (_, code) => `<code>${code}</code>`,
  );
  const withBold = withCode.replace(
    /\*\*([^*]+)\*\*/g,
    (_, bold) => `<strong>${bold}</strong>`,
  );

  return <span dangerouslySetInnerHTML={{ __html: withBold }} />;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function CodeBlockView({
  block,
  index,
}: {
  block: CodeBlock;
  index: number;
}) {
  return (
    <figure className="overflow-hidden rounded-lg border border-ink-700 bg-ink-950">
      <figcaption className="flex items-center justify-between gap-3 border-b border-ink-800 bg-ink-900 px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-wide text-slate-500">
          {block.caption ?? block.language}
        </span>
        <CopyButton text={block.code} />
      </figcaption>
      <pre className="pp-scroll-x p-4">
        <code className={cn("pp-code text-slate-300")}>{block.code}</code>
      </pre>
      <span className="sr-only">Code block {index + 1}</span>
    </figure>
  );
}

function CopyButton({ text }: { text: string }) {
  return <CopyButtonClient text={text} />;
}

export function CodeBlocks({ blocks }: { blocks: CodeBlock[] }) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <CodeBlockView key={i} block={block} index={i} />
      ))}
    </div>
  );
}

export type ScenarioStepShape = {
  id: string;
  order: number;
  prompt: string;
  options: string[];
  correctOptions: number[];
  reasoning: string;
  codeBlocks: unknown;
};
