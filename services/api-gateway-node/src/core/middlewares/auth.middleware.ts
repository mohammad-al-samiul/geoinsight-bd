import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "../errors/api.error";
import { JwtPayload } from "../types/express";

export const authenticate =
  () =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      next(ApiError.unauthorized());
      return;
    }

    try {
      req.user = jwt.verify(header.slice(7), env.JWT_SECRET) as JwtPayload;
      next();
    } catch {
      next(ApiError.unauthorized("Invalid or expired token"));
    }
  };
