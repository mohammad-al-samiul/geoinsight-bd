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

function mapProfile(data: MeResponse["data"]): AuthUser {
  return {
    id: data.id,
    email: data.email,
    fullName: data.email.split("@")[0].replace(/\./g, " "),
    role: data.role,
    adminUnitId: data.adminUnitId,
    adminUnitName: data.adminUnit?.name,
  };
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
      if (json.success) setUser(mapProfile(json.data));
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (!initialUser) {
      refreshProfile().finally(() => setIsLoading(false));
    }
  }, [initialUser, refreshProfile]);

  const login = useCallback(async (email: string, password: string) => {
    await authFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await refreshProfile();
  }, [refreshProfile]);

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
  if (!ctx?.user) {
    if (ctx?.isLoading) {
      return {
        id: "loading",
        email: "loading@geoinsight.gov.bd",
        fullName: "Authenticating…",
        role: "PMO",
        adminUnitId: null,
        adminUnitName: ROLE_META.PMO.label,
      };
    }
    throw new Error("useAuth requires an authenticated session");
  }
  return ctx.user;
}

export function useAuthActions() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthActions must be used within AuthProvider");
  return ctx;
}
