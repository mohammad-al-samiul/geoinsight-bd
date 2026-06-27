import { Router } from "express";

/** Contract for self-contained feature modules (Open/Closed — extend via new modules). */
export interface AppModule {
  readonly name: string;
  register(router: Router): void;
}

export abstract class BaseModule implements AppModule {
  abstract readonly name: string;
  abstract register(router: Router): void;
}
