"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import type { AnomalyAlert, BlockchainVerificationStatus } from "@/types/alerts";
import { cn } from "@/lib/utils";
import { SourceLink } from "@/components/ui/source-link";
import {
  CheckCircle2,
  Clock,
  Copy,
  Link2,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";

const STATUS_META: Record<
  BlockchainVerificationStatus,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  VERIFIED: {
    label: "Hyperledger Verified",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    icon: ShieldCheck,
  },
  PENDING: {
    label: "Anchoring Pending",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    icon: Clock,
  },
  UNANCHORED: {
    label: "Not Yet Anchored",
    className: "border-muted-foreground/40 bg-muted/30 text-muted-foreground",
    icon: ShieldAlert,
  },
  MISMATCH: {
    label: "Hash Mismatch",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
    icon: XCircle,
  },
};

interface AlertDetailModalProps {
  alert: AnomalyAlert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved?: () => void;
}

export function AlertDetailModal({
  alert,
  open,
  onOpenChange,
  onResolved,
}: AlertDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  if (!alert) return null;

  const status = STATUS_META[alert.verificationStatus];
  const StatusIcon = status.icon;
  const isResolved = Boolean(alert.resolvedAt);

  const copyHash = async () => {
    if (!alert.blockchainHash) return;
    await navigator.clipboard.writeText(alert.blockchainHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resolveAlert = async () => {
    setResolving(true);
    setResolveError(null);
    try {
      await apiClient(`alerts/${alert.id}/resolve`, { method: "PATCH" });
      onResolved?.();
      onOpenChange(false);
    } catch (err) {
      setResolveError(err instanceof Error ? err.message : "Could not resolve alert");
    } finally {
      setResolving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-left">{alert.headline}</DialogTitle>
          <DialogDescription className="text-left">
            {alert.flagType.replace(/_/g, " ")} · {alert.unitName} ·{" "}
            {new Date(alert.createdAt).toLocaleString("en-BD")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-foreground/90">{alert.detail}</p>

          <div className="grid gap-3 rounded-lg border border-border/60 bg-secondary/30 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Project</span>
              <span className="text-right font-medium">{alert.projectTitle}</span>
            </div>
            {alert.contractorName && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Contractor</span>
                <span className="font-medium">{alert.contractorName}</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Administrative Unit</span>
              <span className="font-medium">{alert.unitName}</span>
            </div>
            {isResolved && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Resolved</span>
                <span className="font-medium text-emerald-400">
                  {new Date(alert.resolvedAt!).toLocaleString("en-BD")}
                </span>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border/60 p-4">
            {alert.live ? (
              <>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold">Live News Source</h4>
                  <Badge variant="outline" className="gap-1 border-sky-500/40 bg-sky-500/10 text-sky-400">
                    <Link2 className="h-3 w-3" />
                    Pipeline
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  This alert was extracted in real time from Bangladeshi news feeds
                  {alert.sourceName ? ` (${alert.sourceName})` : ""}.
                </p>
                {alert.sourceUrl && (
                  <div className="mt-3">
                    <SourceLink
                      href={alert.sourceUrl}
                      title="View original article"
                      meta={alert.sourceName ?? undefined}
                      clamp={1}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold">Immutable Ledger Verification</h4>
                  <Badge variant="outline" className={cn("gap-1", status.className)}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                </div>

                {alert.blockchainHash ? (
                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                        SHA-256 Block Hash
                      </p>
                      <div className="flex items-start gap-2">
                        <code className="flex-1 break-all rounded-md bg-background/80 p-2 text-[11px] text-primary">
                          {alert.blockchainHash}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          onClick={copyHash}
                          aria-label="Copy hash"
                        >
                          {copied ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {alert.fabricTxId && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Link2 className="h-3.5 w-3.5" />
                        Fabric TX:{" "}
                        <span className="font-mono text-foreground">{alert.fabricTxId}</span>
                      </div>
                    )}

                    {alert.verificationStatus === "VERIFIED" && (
                      <p className="flex items-center gap-2 text-xs text-emerald-400">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Hash matches Hyperledger Fabric anchor — record is tamper-evident.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This alert has not been anchored to the permissioned ledger yet. Anchoring
                    is queued by the blockchain milestone worker.
                  </p>
                )}
              </>
            )}
          </div>

          {resolveError && (
            <p className="text-sm text-destructive">{resolveError}</p>
          )}

          <div className="flex justify-end gap-2">
            {!isResolved && (
              <Button
                variant="default"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={resolveAlert}
                disabled={resolving}
              >
                {resolving ? "Resolving…" : "Mark Resolved"}
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
