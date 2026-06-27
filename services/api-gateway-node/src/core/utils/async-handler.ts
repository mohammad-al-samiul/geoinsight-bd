import { NextFunction, Request, Response } from "express";

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const asyncHandler =
  (fn: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res, next).catch(next);
  };

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
): Response =>
  res.status(statusCode).json({ success: true, data });

export const sendCreated = <T>(res: Response, data: T): Response =>
  sendSuccess(res, data, 201);
