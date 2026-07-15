"use client";

import { useEffect, useState } from "react";
import { ensureAdminUnits } from "@/lib/admin-units";

export function useAdminHierarchy() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    const boot = async () => {
      while (!cancelled && tries < 8) {
        tries += 1;
        const units = await ensureAdminUnits();
        if (units.length > 0) {
          if (!cancelled) setReady(true);
          return;
        }
        await new Promise((r) => setTimeout(r, 800 * tries));
      }
      if (!cancelled) setReady(true);
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready };
}
