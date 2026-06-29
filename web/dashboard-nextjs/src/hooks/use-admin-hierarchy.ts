"use client";

import { useEffect, useState } from "react";
import { ensureAdminUnits } from "@/lib/admin-units";

export function useAdminHierarchy() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void ensureAdminUnits().finally(() => setReady(true));
  }, []);

  return { ready };
}
