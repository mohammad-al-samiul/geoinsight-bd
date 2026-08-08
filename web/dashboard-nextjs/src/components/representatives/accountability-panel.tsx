"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, TrendingDown, TrendingUp, Users } from "lucide-react";
import { useAccountabilityScores } from "@/hooks/use-accountability";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IntelCard, MotionList, fadeUp } from "@/components/ui/intel-card";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { cn } from "@/lib/utils";

export function AccountabilityPanel() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const { scores, loading, error, reload } = useAccountabilityScores(lang);

  if (loading && scores.length === 0) {
    return (
      <IntelCard hoverLift={false} className="text-sm text-muted-foreground">
        Scoring representative accountability…
      </IntelCard>
    );
  }

  return (
    <IntelCard padding="lg" hoverLift={false} accent="info">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
            <Users className="h-4 w-4 text-primary" />
            Representative Accountability AI
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            KPI trend + peer comparison — grievance resolution vs district average
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={lang === "bn" ? "default" : "outline"} onClick={() => setLang("bn")}>
            বাংলা
          </Button>
          <Button size="sm" variant="outline" onClick={reload} className="gap-1">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      <MotionList className="mt-4 space-y-2.5">
        {scores.length === 0 ? (
          <p className="text-sm text-muted-foreground">No representatives in scope.</p>
        ) : (
          scores.map((s, i) => (
            <motion.div key={s.representative_id} variants={fadeUp} custom={i}>
              <div className="rounded-xl border border-border/50 bg-secondary/25 px-3.5 py-3 transition hover:border-primary/25 hover:bg-secondary/40">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold tracking-tight">{s.name}</span>
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/10 text-[10px] text-primary"
                  >
                    Score {s.accountability_score}/100
                  </Badge>
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-[10px]",
                      s.peer_delta_pct >= 0 ? "text-emerald-400" : "text-red-400",
                    )}
                  >
                    {s.peer_delta_pct >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {s.peer_delta_pct > 0 ? "+" : ""}
                    {s.peer_delta_pct}% vs peer
                  </span>
                </div>
                <div className="mt-2.5">
                  <ProgressMeter value={s.accountability_score} delay={0.05 + i * 0.04} />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {lang === "bn" ? s.explanation_bn : s.explanation}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </MotionList>
    </IntelCard>
  );
}
