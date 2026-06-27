import { NextFunction, Request, Response } from "express";
import { ZodError, ZodSchema } from "zod";
import { ApiError } from "../errors/api.error";

type RequestPart = "body" | "query" | "params";

export const validate =
  <T>(schema: ZodSchema<T>, part: RequestPart = "body") =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      next(formatZodError(result.error));
      return;
    }
    (req as Request & Record<string, unknown>)[part] = result.data;
    next();
  };

function formatZodError(error: ZodError): ApiError {
  return ApiError.badRequest(
    "Validation failed",
    error.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
  );
}
