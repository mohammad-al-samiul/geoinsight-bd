import { z } from "zod";
import { UserRole } from "@prisma/client";

export const loginSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  password: z.string().min(8).max(128),
});

export const registerSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  phone: z.string().max(20).trim().optional(),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/[0-9]/, "Must contain digit"),
  role: z.nativeEnum(UserRole),
  adminUnitId: z.string().uuid().optional().nullable(),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(32).max(256),
});

export const logoutSchema = refreshSchema.extend({
  accessToken: z.string().min(20).optional(),
});

export const mfaVerifySchema = z.object({
  mfaToken: z.string().min(20).max(2048),
  code: z.string().regex(/^\d{6}$/),
});

export const mfaEnableSchema = z.object({
  secret: z.string().min(16).max(128),
  code: z.string().regex(/^\d{6}$/),
});

export const mfaDisableSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});

export type RefreshDto = z.infer<typeof refreshSchema>;
export type LogoutDto = z.infer<typeof logoutSchema>;
export type MfaVerifyDto = z.infer<typeof mfaVerifySchema>;
export type MfaEnableDto = z.infer<typeof mfaEnableSchema>;
export type MfaDisableDto = z.infer<typeof mfaDisableSchema>;
