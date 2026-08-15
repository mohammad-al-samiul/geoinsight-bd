import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { authRateLimiter } from "../../core/middlewares/rate-limiter.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { RbacMiddleware } from "../../core/middlewares/rbac.middleware";
import {
  loginSchema,
  logoutSchema,
  mfaDisableSchema,
  mfaEnableSchema,
  mfaEnrollSchema,
  mfaVerifySchema,
  refreshSchema,
  registerSchema,
} from "./auth.validator";
import { AuthController } from "./auth.controller";

export function createAuthRoutes(
  controller: AuthController,
  rbac: RbacMiddleware,
): Router {
  const router = Router();

  router.post(
    "/register",
    authenticate(),
    rbac.requireRoles(UserRole.PMO),
    validate(registerSchema),
    controller.register,
  );
  router.post("/login", authRateLimiter, validate(loginSchema), controller.login);
  router.post(
    "/mfa/verify",
    authRateLimiter,
    validate(mfaVerifySchema),
    controller.verifyMfa,
  );
  router.post(
    "/mfa/enroll",
    authRateLimiter,
    validate(mfaEnrollSchema),
    controller.enrollMfa,
  );
  router.post("/mfa/setup", authenticate(), controller.setupMfa);
  router.post(
    "/mfa/enable",
    authenticate(),
    validate(mfaEnableSchema),
    controller.enableMfa,
  );
  router.post(
    "/mfa/disable",
    authenticate(),
    validate(mfaDisableSchema),
    controller.disableMfa,
  );
  router.post("/refresh", authRateLimiter, validate(refreshSchema), controller.refresh);
  router.post("/logout", validate(logoutSchema), controller.logout);
  router.get("/me", authenticate(), controller.me);

  return router;
}
