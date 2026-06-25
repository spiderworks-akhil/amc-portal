import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "./decorators/public.decorator";
import { ROLES_KEY } from "./decorators/roles.decorator";
import { AuthService } from "./auth.service";
import type { UserRole } from "../../db/types.generated";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Allow routes decorated with @Public() to bypass auth entirely
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 2. Extract token from Authorization header or cookie
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException("No authentication token provided");
    }

    // 3. Verify JWT signature and expiration
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    // 4. Check if the token has been revoked
    if (payload.jti) {
      const revoked = await this.authService.isTokenRevoked(payload.jti);
      if (revoked) {
        throw new UnauthorizedException("Token has been revoked");
      }
    }

    // 5. Attach user payload to request for @CurrentUser() decorator
    (request as any).user = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      jti: payload.jti,
    };

    // 6. Check role-based access if @Roles() is set on the handler or class
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles && requiredRoles.length > 0) {
      const userRole = payload.role as UserRole;
      if (!requiredRoles.includes(userRole)) {
        throw new ForbiddenException(
          `Insufficient permissions. Required role: ${requiredRoles.join(" or ")}`,
        );
      }
    }

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }
    return request.cookies?.token;
  }
}
