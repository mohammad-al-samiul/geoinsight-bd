"use client";

import { cn } from "@/lib/utils";

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function renderBlock(block: string, key: number) {
  const trimmed = block.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("### ")) {
    return (
      <h4 key={key} className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <InlineMarkdown text={trimmed.slice(4)} />
      </h4>
    );
  }
  if (trimmed.startsWith("## ")) {
    return (
      <h3 key={key} className="mb-2 mt-1 border-b border-border/40 pb-1 text-sm font-bold text-primary">
        <InlineMarkdown text={trimmed.slice(3)} />
      </h3>
    );
  }
  if (trimmed.startsWith("# ")) {
    return (
      <h2 key={key} className="mb-2 text-base font-bold">
        <InlineMarkdown text={trimmed.slice(2)} />
      </h2>
    );
  }

  if (trimmed.startsWith("---")) {
    return <hr key={key} className="my-2 border-border/50" />;
  }

  const lines = trimmed.split("\n").filter((l) => l.trim());
  const isBulletList = lines.every((l) => /^[-*•]\s/.test(l.trim()));
  const isNumbered = lines.every((l) => /^\d+[.)]\s/.test(l.trim()));

  if (isBulletList) {
    return (
      <ul key={key} className="my-1 space-y-1.5 pl-1">
        {lines.map((line, j) => (
          <li key={j} className="flex gap-2 text-sm leading-relaxed">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
            <span>
              <InlineMarkdown text={line.replace(/^[-*•]\s+/, "")} />
            </span>
          </li>
        ))}
      </ul>
    );
  }

  if (isNumbered) {
    return (
      <ol key={key} className="my-1 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
        {lines.map((line, j) => (
          <li key={j}>
            <InlineMarkdown text={line.replace(/^\d+[.)]\s+/, "")} />
          </li>
        ))}
      </ol>
    );
  }

  return (
    <p key={key} className="text-sm leading-relaxed text-foreground/90">
      <InlineMarkdown text={lines.join(" ")} />
    </p>
  );
}

interface ChatMarkdownProps {
  content: string;
  className?: string;
}

/** Renders assistant Markdown (headings, bullets, bold) for chat bubbles. */
export function ChatMarkdown({ content, className }: ChatMarkdownProps) {
  const normalized = content.replace(/\r\n/g, "\n").replace(/(?<!\n)\n(?=[-*•#])/g, "\n\n");
  const blocks = normalized.split(/\n\n+/);

  return (
    <div className={cn("space-y-2", className)}>
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}
