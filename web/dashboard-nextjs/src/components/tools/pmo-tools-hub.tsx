"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Bot,
  Cpu,
  MapPinned,
  MessageCircle,
  MessageSquareWarning,
  SlidersHorizontal,
  Workflow,
} from "lucide-react";
import { ModuleShell } from "@/components/modules/module-shell";
import { IntelCard } from "@/components/ui/intel-card";

const TOOLS = [
  { href: "/sovereign-ai", key: "sovereignAi", icon: Bot },
  { href: "/digital-twin", key: "digitalTwin", icon: Cpu },
  { href: "/sentiment", key: "sentiment", icon: MessageSquareWarning },
  { href: "/simulator", key: "simulator", icon: SlidersHorizontal },
  { href: "/citizen-chat", key: "citizenChat", icon: MessageCircle },
  { href: "/proximity", key: "proximity", icon: MapPinned },
  { href: "/ops", key: "ops", icon: Workflow },
] as const;

export function PmoToolsHub() {
  const t = useTranslations("modules.tools");
  const tn = useTranslations("nav");

  return (
    <ModuleShell title={t("title")} description={t("description")}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {TOOLS.map((item) => {
          const Icon = item.icon;
          const label =
            item.key === "sovereignAi"
              ? tn("sovereignAi")
              : item.key === "digitalTwin"
                ? tn("digitalTwin")
                : item.key === "sentiment"
                  ? tn("sentiment")
                  : item.key === "simulator"
                    ? tn("simulator")
                    : item.key === "citizenChat"
                      ? tn("citizenChat")
                      : item.key === "proximity"
                        ? tn("proximity")
                        : tn("ops");
          const hint =
            item.key === "sovereignAi"
              ? t("hintSovereign")
              : item.key === "digitalTwin"
                ? t("hintTwin")
                : item.key === "sentiment"
                  ? t("hintSentiment")
                  : item.key === "simulator"
                    ? t("hintSimulator")
                    : item.key === "citizenChat"
                      ? t("hintCitizen")
                      : item.key === "proximity"
                        ? t("hintProximity")
                        : t("hintOps");
          return (
            <Link key={item.href} href={item.href} className="block hover:opacity-95">
              <IntelCard hoverLift className="h-full">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <div>
                    <p className="font-display text-sm font-semibold">{label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>
                  </div>
                </div>
              </IntelCard>
            </Link>
          );
        })}
      </div>
    </ModuleShell>
  );
}
