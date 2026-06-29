"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectDetail } from "@/hooks/use-module-data";
import { formatDate, formatLakh } from "@/lib/format";
import type { ProjectRow } from "@/lib/module-types";
import { resolveUnitName } from "@/lib/unit-names";
import { AlertTriangle } from "lucide-react";

interface ProjectDetailModalProps {
  project: ProjectRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColor: Record<string, string> = {
  ONGOING: "bg-primary/20 text-primary",
  COMPLETED: "bg-emerald-500/20 text-emerald-400",
  STALLED: "bg-amber-500/20 text-amber-400",
  PLANNED: "bg-blue-500/20 text-blue-400",
  CANCELLED: "bg-red-500/20 text-red-400",
};

export function ProjectDetailModal({ project, open, onOpenChange }: ProjectDetailModalProps) {
  const { detail, loading, error } = useProjectDetail(project?.id ?? null);

  if (!project) return null;

  const allocated = Number(project.budgetAllocated);
  const spent = Number(project.budgetSpent);
  const variance = allocated > 0 ? ((spent - allocated) / allocated) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-left">{project.title}</DialogTitle>
          <DialogDescription className="text-left">
            {resolveUnitName(project.adminUnitId)} · Started {formatDate(project.startDate)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
            <p className="text-xs text-muted-foreground">Allocated</p>
            <p className="text-lg font-bold">{formatLakh(allocated)}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
            <p className="text-xs text-muted-foreground">Spent</p>
            <p className="text-lg font-bold">{formatLakh(spent)}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
            <p className="text-xs text-muted-foreground">Variance</p>
            <p
              className={`text-lg font-bold ${variance > 10 ? "text-red-400" : variance > 0 ? "text-amber-400" : "text-emerald-400"}`}
            >
              {variance > 0 ? "+" : ""}
              {variance.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className={statusColor[String(project.status)] ?? ""}>{String(project.status)}</Badge>
          {project.blockchainTx ? (
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
              Blockchain Anchored
            </Badge>
          ) : (
            <Badge variant="outline">Anchoring Pending</Badge>
          )}
          {project.contractorNid && (
            <Badge variant="outline">NID: {project.contractorNid}</Badge>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : detail?.redFlagAlerts && detail.redFlagAlerts.length > 0 ? (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Red Flag Alerts ({detail.redFlagAlerts.length})
            </h4>
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {detail.redFlagAlerts.map((alert) => (
                <li
                  key={alert.id}
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
                >
                  <p className="font-medium">{alert.flagType.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Severity {alert.severity} · {formatDate(alert.createdAt)}
                  </p>
                  {alert.aiExplanation && (
                    <p className="mt-1 text-xs">{alert.aiExplanation}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active red flags on this project.</p>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
