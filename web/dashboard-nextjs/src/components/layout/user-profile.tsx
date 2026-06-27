"use client";

import { useAuth } from "@/hooks/use-auth";
import { ROLE_META } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export function UserProfile({ collapsed }: { collapsed?: boolean }) {
  const user = useAuth();
  const meta = ROLE_META[user.role];
  const initials = user.fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (collapsed) {
    return (
      <div className="flex justify-center py-3">
        <Avatar className="h-9 w-9 ring-primary/40">
          <AvatarFallback className="bg-primary/20 text-primary">{initials}</AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <div className="mx-3 mb-4 rounded-lg border border-sidebar-border bg-secondary/30 p-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0 ring-2 ring-primary/30">
          <AvatarFallback className="bg-primary/15 text-sm font-bold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">{user.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <Badge
            variant="outline"
            className={cn("mt-2 border text-[10px] font-bold uppercase tracking-wide", meta.badgeClass)}
          >
            <Shield className="mr-1 h-3 w-3" />
            {user.role.replace("_", " ")}
          </Badge>
          {user.adminUnitName && (
            <p className="mt-2 truncate text-[11px] leading-tight text-muted-foreground">
              <span className="text-primary/80">Scope:</span> {user.adminUnitName}
            </p>
          )}
          <p className="mt-0.5 text-[10px] text-muted-foreground/70">{meta.labelBn}</p>
        </div>
      </div>
    </div>
  );
}
