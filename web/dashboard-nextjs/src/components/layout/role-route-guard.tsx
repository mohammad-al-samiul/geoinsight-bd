"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthContext } from "@/hooks/use-auth";
import { isLocalEntityRole } from "@/types";

const LOCAL_ALLOWED_PREFIXES = ["/local", "/forbidden", "/narrative-shield"];

function isLocalAllowedPath(pathname: string): boolean {
  return LOCAL_ALLOWED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** Keep MP/Mayor inside Local DSS; keep PMO on the national dashboard by default. */
export function RoleRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuthContext();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;

    if (isLocalEntityRole(user.role)) {
      if (!isLocalAllowedPath(pathname)) {
        router.replace("/local");
      }
      return;
    }

    // National roles landing on bare /dashboard → national home
    if (pathname === "/dashboard") {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, user, pathname, router]);

  return <>{children}</>;
}
