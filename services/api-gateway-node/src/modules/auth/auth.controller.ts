import { Request, Response } from "express";
import { asyncHandler, sendCreated, sendSuccess } from "../../core/utils/async-handler";
import { AuthService } from "./auth.service";
import {
  LoginDto,
  LogoutDto,
  MfaDisableDto,
  MfaEnableDto,
  MfaVerifyDto,
  RefreshDto,
  RegisterDto,
} from "./auth.validator";

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

  verifyMfa = asyncHandler(async (req: Request, res: Response) => {
    const { mfaToken, code } = req.body as MfaVerifyDto;
    sendSuccess(res, await this.authService.verifyMfa(mfaToken, code));
  });

  setupMfa = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.authService.setupMfa(req.user!.sub));
  });

  enableMfa = asyncHandler(async (req: Request, res: Response) => {
    const { secret, code } = req.body as MfaEnableDto;
    sendSuccess(res, await this.authService.enableMfa(req.user!.sub, secret, code));
  });

  disableMfa = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.body as MfaDisableDto;
    sendSuccess(res, await this.authService.disableMfa(req.user!.sub, code));
  });

  me = asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await this.authService.getProfile(req.user!.sub));
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body as RefreshDto;
    sendSuccess(res, await this.authService.refresh(refreshToken));
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken, accessToken } = req.body as LogoutDto;
    sendSuccess(res, await this.authService.logout(refreshToken, accessToken));
  });
}
