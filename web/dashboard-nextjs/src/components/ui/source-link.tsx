"use client";

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface SourceLinkProps {
  href: string | null | undefined;
  title: string;
  /** Secondary line under the title (publisher, domain, …) */
  meta?: string | null;
  className?: string;
  titleClassName?: string;
  /** Clamp title lines; default 2 */
  clamp?: 1 | 2 | 3;
  /** Open link ARIA / title (bn or en) */
  openLabel?: string;
  /** Short button text shown next to the icon */
  openText?: string;
}

function safeHref(href: string | null | undefined): string | null {
  if (!href?.trim()) return null;
  const h = href.trim();
  if (h.startsWith("http://") || h.startsWith("https://") || h.startsWith("/")) return h;
  if (h.startsWith("//")) return `https:${h}`;
  return `https://${h}`;
}

/**
 * Clickable helper/source link with a clear external-link control.
 * Same pattern everywhere: title text + labeled icon button → real URL (new tab).
 */
export function SourceLink({
  href,
  title,
  meta,
  className,
  titleClassName,
  clamp = 2,
  openLabel = "সোর্স খুলুন / Open source",
  openText = "লিংক",
}: SourceLinkProps) {
  const url = safeHref(href);
  const clampClass =
    clamp === 1 ? "line-clamp-1" : clamp === 3 ? "line-clamp-3" : "line-clamp-2";

  if (!url) {
    return (
      <div className={cn("min-w-0", className)}>
        <p className={cn("font-medium text-foreground/90", clampClass, titleClassName)} title={title}>
          {title}
        </p>
        {meta ? <p className="mt-0.5 text-[10px] text-muted-foreground">{meta}</p> : null}
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={openLabel}
      title={openLabel}
      className={cn(
        "group flex items-start gap-3 rounded-md outline-none",
        "focus-visible:ring-2 focus-visible:ring-sky-400/50",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-medium text-sky-200/95 underline decoration-sky-500/40 underline-offset-2",
            "transition-colors group-hover:text-sky-100 group-hover:decoration-sky-300",
            clampClass,
            titleClassName,
          )}
        >
          {title}
        </p>
        {meta ? <p className="mt-0.5 text-[10px] text-muted-foreground">{meta}</p> : null}
      </div>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5",
          "border border-sky-400/50 bg-sky-500/20 text-[11px] font-semibold text-sky-100",
          "shadow-sm transition-colors",
          "group-hover:border-sky-300 group-hover:bg-sky-500/35",
        )}
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        {openText}
      </span>
    </a>
  );
}
