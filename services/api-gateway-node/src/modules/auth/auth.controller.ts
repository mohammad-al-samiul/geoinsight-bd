import { Request, Response } from "express";
import { asyncHandler, sendCreated, sendSuccess } from "../../core/utils/async-handler";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./auth.validator";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = asyncHandler(async (req: Request, res: Response) => {
    const data = await this.authService.register(
      req.body as RegisterDto,
      req.user!.sub,
      req.ip,
    );
    sendCreated(res, data);
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as LoginDto;
    sendSuccess(res, await this.authService.login(email, password));
  });

  me = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.authService.getProfile(req.user!.sub));
  });
}
