import { Router } from "express";
import { AppModule } from "../../core/module/app-module.interface";
import {
  createPublicFeedRoutes,
  sovereignFeedGuard,
} from "./public-feed.routes";

class PublicFeedModule implements AppModule {
  readonly name = "public-feed";

  register(basePath: Router): void {
    basePath.use("/public/feeds", sovereignFeedGuard(), createPublicFeedRoutes());
  }
}

export const publicFeedModule = new PublicFeedModule();
