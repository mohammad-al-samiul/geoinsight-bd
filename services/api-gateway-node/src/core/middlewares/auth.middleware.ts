import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "../errors/api.error";
import { JwtPayload } from "../types/express";
import { jwtSessionService } from "../../infrastructure/session/jwt-session.service";

export const authenticate =
  () =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      next(ApiError.unauthorized());
      return;
    }

    const token = header.slice(7);

    try {
      if (await jwtSessionService.isAccessTokenBlacklisted(token)) {
        next(ApiError.unauthorized("Token revoked"));
        return;
      }

      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload & {
        jti?: string;
        iat?: number;
      };

      if (await jwtSessionService.isUserSessionRevoked(payload.sub, payload.iat)) {
        next(ApiError.unauthorized("Session revoked"));
        return;
      }

      req.user = payload;
      next();
    } catch {
      next(ApiError.unauthorized("Invalid or expired token"));
    }
  };
