import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

interface ErrorResponse {
  message: string;
  error: string;
  statusCode: number;
  details?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception);
    const statusCode = errorResponse.statusCode;

    // Log with appropriate severity — Pino handles the output format
    const logMeta = {
      method: request.method,
      url: request.url,
      statusCode,
      ip: request.ip,
    };

    if (statusCode >= 500) {
      this.logger.error(
        { ...logMeta, err: exception },
        errorResponse.message,
      );
    } else {
      this.logger.warn(
        { ...logMeta },
        `${errorResponse.message} (${statusCode})`,
      );
    }

    response.status(statusCode).json(errorResponse);
  }

  private buildErrorResponse(
    exception: unknown,
  ): ErrorResponse {
    // ── NestJS HTTP exceptions (NotFoundException, BadRequestException, etc.) ──
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const responseBody = exception.getResponse();

      // Handle ValidationPipe's structured error array
      if (typeof responseBody === "object" && responseBody !== null) {
        const body = responseBody as Record<string, unknown>;

        // ValidationPipe returns { message: string[], error: string, statusCode }
        if (Array.isArray(body.message)) {
          return {
            message: "Validation failed",
            error: (body.error as string) ?? "Bad Request",
            statusCode: body.statusCode as number,
            details: body.message,
          };
        }

        // Standard HttpException body: { message, error, statusCode }
        return {
          message: (body.message as string) ?? "Unknown error",
          error: (body.error as string) ?? this.getDefaultErrorName(statusCode),
          statusCode: body.statusCode as number,
        };
      }

      // Plain string message
      return {
        message: responseBody as string,
        error: this.getDefaultErrorName(statusCode),
        statusCode,
      };
    }

    // ── Unexpected / unhandled errors ──
    const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof Error ? exception.message : "Internal server error";

    // In production, never leak internal error details
    if (process.env.NODE_ENV === "production") {
      return {
        message: "Internal server error",
        error: "Internal Server Error",
        statusCode,
      };
    }

    return {
      message,
      error: "Internal Server Error",
      statusCode,
    };
  }

  private getDefaultErrorName(statusCode: number): string {
    const map: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: "Bad Request",
      [HttpStatus.UNAUTHORIZED]: "Unauthorized",
      [HttpStatus.FORBIDDEN]: "Forbidden",
      [HttpStatus.NOT_FOUND]: "Not Found",
      [HttpStatus.CONFLICT]: "Conflict",
      [HttpStatus.TOO_MANY_REQUESTS]: "Too Many Requests",
      [HttpStatus.INTERNAL_SERVER_ERROR]: "Internal Server Error",
      [HttpStatus.SERVICE_UNAVAILABLE]: "Service Unavailable",
    };
    return map[statusCode] ?? "Error";
  }
}
