import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectKysely } from "nestjs-kysely";
import { Kysely, sql } from "kysely";
import { randomUUID } from "crypto";
import axios from "axios";
import { DB } from "src/db/types.generated";

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

    const remoteUserId = String(decoded.id);
    if (!/^\d+$/.test(remoteUserId)) {
      throw new UnauthorizedException(
        "Invalid external token: user ID must be a numeric value (BigInt). You may be sending an AMC JWT instead of the original SpiderWorks token.",
      );
    }

    const user = await this.db
      .insertInto("users")
      .values({
        remote_user_id: BigInt(remoteUserId),
        name: decoded.name || "Unknown",
        email: decoded.email || null,
        role: "user",
        is_active: true,
        access_token:externalToken
      })
      .onConflict((oc) =>
        oc.column("remote_user_id").doUpdateSet({
          name: decoded.name || "Unknown",
          email: decoded.email || null,
          access_token: externalToken,
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
    let tokenExpired = false;

    // First try normal verification
    try {
      decoded = this.jwtService.verify(currentToken);
    } catch {
      // If expired, try with ignoreExpiration to check within grace period (30 min)
      try {
        decoded = this.jwtService.verify(currentToken, { ignoreExpiration: true });
        tokenExpired = true;

        // Reject tokens that expired more than 30 minutes ago
        if (decoded.exp && Date.now() / 1000 - decoded.exp > 1800) {
          throw new UnauthorizedException("Token expired too long ago, please log in again");
        }
      } catch {
        throw new UnauthorizedException("Invalid or expired token");
      }
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
