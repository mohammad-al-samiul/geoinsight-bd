import { Router } from "express";
import { BaseModule } from "../../core/module/app-module.interface";
import { container } from "../../core/di/container";
import { BlockchainController } from "./blockchain.controller";
import { createBlockchainRoutes } from "./blockchain.routes";

export class BlockchainModule extends BaseModule {
  readonly name = "blockchain";

  private readonly controller = new BlockchainController(container.blockchainService);

  register(router: Router): void {
    router.use("/blockchain", createBlockchainRoutes(this.controller, container.rbac));
  }
}

export const blockchainModule = new BlockchainModule();
