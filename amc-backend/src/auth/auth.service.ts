import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectKysely } from "nestjs-kysely";
import { Kysely, sql } from "kysely";
import { randomUUID } from "crypto";
import axios from "axios";
import type { DB } from "../db/database.interface";

@Injectable()
export class AuthService {
  private readonly authServiceUrl: string;

  constructor(
    @InjectKysely() private readonly db: Kysely<DB>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.authServiceUrl = this.configService.get<string>(
      "AUTH_SERVICE_URL",
      "https://access.spiderworks.org/api",
    );
  }

  async exchangeToken(externalToken: string) {
    if (!externalToken) {
      throw new UnauthorizedException("No authentication token provided");
    }

    let decoded: any;
    try {
      decoded = this.jwtService.verify(externalToken);
    } catch {
      throw new UnauthorizedException("Invalid or expired external token");
    }

    if (!decoded?.id) {
      throw new UnauthorizedException("Invalid token: missing user ID");
    }

    const user = await this.db
      .insertInto("users")
      .values({
        remote_user_id: BigInt(decoded.id),
        name: decoded.name || "Unknown",
        email: decoded.email || null,
        role: "staff",
        is_active: true,
      })
      .onConflict((oc) =>
        oc.column("remote_user_id").doUpdateSet({
          name: decoded.name || "Unknown",
          email: decoded.email || null,
          last_login_at: sql`now()`,
        }),
      )
      .returningAll()
      .executeTakeFirst();

    if (!user) {
      throw new UnauthorizedException("Failed to create/update user");
    }

    const jti = randomUUID();
    const token = this.jwtService.sign({
      id: user.id,
      email: user.email,
      name: user.name,
      jti,
    });

    return {
      token,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  async refreshToken(currentToken: string) {
    let decoded: any;
    try {
      decoded = this.jwtService.verify(currentToken);
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    if (decoded.jti) {
      const revoked = await this.db
        .selectFrom("revoked_tokens")
        .selectAll()
        .where("jti", "=", decoded.jti)
        .executeTakeFirst();

      if (revoked) {
        throw new UnauthorizedException("Token has been revoked");
      }
    }

    const user = await this.db
      .selectFrom("users")
      .selectAll()
      .where("id", "=", decoded.id)
      .executeTakeFirst();

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const jti = randomUUID();
    const token = this.jwtService.sign({
      id: user.id,
      email: user.email,
      name: user.name,
      jti,
    });

    return { token };
  }

  async revokeToken(token: string) {
    try {
      const decoded = this.jwtService.decode(token) as any;
      if (decoded?.jti) {
        await this.db
          .insertInto("revoked_tokens")
          .values({
            jti: decoded.jti,
            user_id: decoded.id,
            expires_at: new Date(decoded.exp * 1000),
          })
          .execute();
      }
    } catch {
      // Silently fail — token may already be invalid
    }
  }

  async isTokenRevoked(jti: string): Promise<boolean> {
    const revoked = await this.db
      .selectFrom("revoked_tokens")
      .selectAll()
      .where("jti", "=", jti)
      .executeTakeFirst();

    return !!revoked;
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.db
      .deleteFrom("revoked_tokens")
      .where("expires_at", "<", new Date())
      .executeTakeFirst();

    return Number(result.numDeletedRows);
  }

  async getMe(token: string) {
    try {
      const response = await axios.get(`${this.authServiceUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data || response.data;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
