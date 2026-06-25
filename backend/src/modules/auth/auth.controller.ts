import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { Public } from "./decorators/public.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("exchange-token")
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async exchangeToken(
    @Body("token") token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.exchangeToken(token);

    res.cookie("token", result.token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 1000,
    });

    return result;
  }

  @Public()
  @Post("refresh")
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const currentToken = this.extractToken(req);
    if (!currentToken) {
      return { message: "No token to refresh" };
    }

    const result = await this.authService.refreshToken(currentToken);

    res.cookie("token", result.token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 1000,
    });

    return result;
  }

  @SkipThrottle()
  @Public()
  @Get("me")
  async getMe(@Req() req: Request) {
    const token = this.extractToken(req);
    if (!token) {
      return null;
    }
    return this.authService.getMe(token);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = this.extractToken(req);
    if (token) {
      await this.authService.revokeToken(token);
    }

    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    return { message: "Logged out successfully" };
  }

  private extractToken(req: Request): string | undefined {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }
    return req.cookies?.token;
  }
}
