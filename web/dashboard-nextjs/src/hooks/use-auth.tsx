"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AuthUser } from "@/types";

const AuthContext = createContext<AuthUser | null>(null);

export function AuthProvider({
  children,
  overrideUser,
}: {
  children: ReactNode;
  overrideUser: AuthUser;
}) {
  return <AuthContext.Provider value={overrideUser}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthUser {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
