import { Router } from "express";
import { BaseModule } from "../../core/module/app-module.interface";
import { container } from "../../core/di/container";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { createAuthRoutes } from "./auth.routes";

export class AuthModule extends BaseModule {
  readonly name = "auth";

  private readonly service = new AuthService(
    container.adminScopeService,
    container.auditService,
  );
  private readonly controller = new AuthController(this.service);

  register(router: Router): void {
    router.use("/auth", createAuthRoutes(this.controller, container.rbac));
  }
}

export const authModule = new AuthModule();
