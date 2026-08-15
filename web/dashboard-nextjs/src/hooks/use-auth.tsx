"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authFetch } from "@/lib/api-client";
import type { AuthUser, UserRole } from "@/types";
import { ROLE_META } from "@/types";

interface MeResponse {
  success: boolean;
  data: {
    id: string;
    email: string;
    phone: string | null;
    role: UserRole;
    adminUnitId: string | null;
    adminUnit: { id: string; name: string; type: string } | null;
    mfaEnabled?: boolean;
    mfaRequired?: boolean;
    mfaEnforced?: boolean;
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LOADING_USER: AuthUser = {
  id: "loading",
  email: "loading@geoinsight.gov.bd",
  fullName: "Authenticating…",
  role: "PMO",
  adminUnitId: null,
  adminUnitName: ROLE_META.PMO.label,
};

function mapProfile(data: MeResponse["data"]): AuthUser {
  return {
    id: data.id,
    email: data.email,
    fullName: data.email.split("@")[0].replace(/\./g, " "),
    role: data.role,
    adminUnitId: data.adminUnitId,
    adminUnitName: data.adminUnit?.name,
    mfaEnabled: Boolean(data.mfaEnabled),
    mfaRequired: Boolean(data.mfaRequired),
    mfaEnforced: Boolean(data.mfaEnforced),
  };
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const redirect = encodeURIComponent(
    window.location.pathname + window.location.search,
  );
  window.location.href = `/login?redirect=${redirect}`;
}

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: ReactNode;
  initialUser?: AuthUser | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [isLoading, setIsLoading] = useState(!initialUser);

  const refreshProfile = useCallback(async () => {
    try {
      const json = await authFetch<MeResponse>("/api/auth/me");
      if (json.success) {
        setUser(mapProfile(json.data));
        return;
      }
      setUser(null);
    } catch {
      const refreshed = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      }).then((r) => r.ok);

      if (refreshed) {
        try {
          const json = await authFetch<MeResponse>("/api/auth/me");
          if (json.success) {
            setUser(mapProfile(json.data));
            return;
          }
        } catch {
          // fall through
        }
      }
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (!initialUser) {
      refreshProfile().finally(() => setIsLoading(false));
    }
  }, [initialUser, refreshProfile]);

  // Proactive refresh before access token expires (15 min TTL)
  useEffect(() => {
    if (!user) return;

    const refreshSession = async () => {
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) {
          setUser(null);
          redirectToLogin();
        }
      } catch {
        // ignore transient network errors
      }
    };

    const interval = setInterval(refreshSession, 12 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const login = useCallback(
    async (email: string, password: string) => {
      await authFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await refreshProfile();
    },
    [refreshProfile],
  );

  const logout = useCallback(async () => {
    await authFetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
    window.location.href = "/login";
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      refreshProfile,
    }),
    [user, isLoading, login, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthUser {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  useEffect(() => {
    if (!ctx.isLoading && !ctx.user) {
      redirectToLogin();
    }
  }, [ctx.isLoading, ctx.user]);

  if (!ctx.user) {
    return LOADING_USER;
  }
  return ctx.user;
}

export function useAuthActions() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthActions must be used within AuthProvider");
  return ctx;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
