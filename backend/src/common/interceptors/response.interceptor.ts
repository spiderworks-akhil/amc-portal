import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

const DEFAULT_MESSAGES: Record<string, Record<number, string>> = {
  POST: { 201: 'Created successfully' },
  PUT: { 200: 'Updated successfully' },
  PATCH: { 200: 'Updated successfully' },
  DELETE: { 200: 'Deleted successfully' },
};

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    if (request.method === 'GET') {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode;
    const customMessage = this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler());

    return next.handle().pipe(
      map((data) => {
        const message = customMessage ?? DEFAULT_MESSAGES[request.method]?.[statusCode] ?? 'Success';

        if (data && typeof data === 'object' && 'message' in data && 'data' in data) {
          return data;
        }

        return { message, data: data ?? null };
      }),
    );
  }
}
