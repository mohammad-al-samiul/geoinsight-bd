"use client";

import { useTranslations } from "next-intl";
import { useAiStatus } from "@/hooks/use-ai-status";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Bot, Wifi, WifiOff } from "lucide-react";

interface AiStatusBadgeProps {
  className?: string;
  compact?: boolean;
}

export function AiStatusBadge({ className, compact }: AiStatusBadgeProps) {
  const { status, loading } = useAiStatus();
  const t = useTranslations("ai");

  if (loading && !status) {
    return (
      <Badge variant="outline" className={cn("border-muted text-muted-foreground", className)}>
        <Bot className="mr-1 h-3 w-3" />
        {t("checking")}
      </Badge>
    );
  }

  const reachable = status?.ollama_reachable ?? false;
  const model = status?.ollama_model ?? "llama3.1:8b";

  return (
    <Badge
      variant="outline"
      className={cn(
        reachable
          ? "border-emerald-500/40 text-emerald-400"
          : "border-amber-500/40 text-amber-400",
        className,
      )}
      title={
        reachable ? t("ollamaTooltip", { model }) : t("fallbackTooltip")
      }
    >
      {reachable ? (
        <Wifi className="mr-1 h-3 w-3" />
      ) : (
        <WifiOff className="mr-1 h-3 w-3" />
      )}
      {compact
        ? reachable
          ? model.split(":")[0]
          : t("fallback")
        : reachable
          ? t("ollama", { model })
          : t("fallback")}
    </Badge>
  );
}
