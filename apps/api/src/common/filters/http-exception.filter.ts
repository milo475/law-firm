import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';

/** Default Mongolian messages per status code (used when an exception carries only the English default). */
const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'Хүсэлт буруу байна',
  401: 'Нэвтрэх шаардлагатай',
  403: 'Энэ үйлдлийг хийх эрх танд байхгүй байна',
  404: 'Хуудас эсвэл өгөгдөл олдсонгүй',
  405: 'Зөвшөөрөгдөөгүй хүсэлт',
  409: 'Өгөгдөл давхардаж байна',
  413: 'Файлын хэмжээ хэт их байна',
  415: 'Дэмжигдээгүй файлын төрөл',
  422: 'Өгөгдөл боловсруулах боломжгүй',
  429: 'Хэт олон хүсэлт илгээлээ. Түр хүлээгээд дахин оролдоно уу',
  500: 'Серверийн алдаа гарлаа. Дахин оролдоно уу',
  503: 'Үйлчилгээ түр ажиллахгүй байна',
};

const ENGLISH_DEFAULTS = new Set([
  'Bad Request',
  'Unauthorized',
  'Forbidden',
  'Not Found',
  'Conflict',
  'Internal Server Error',
  'Payload Too Large',
  'Unsupported Media Type',
  'Unprocessable Entity',
  'ThrottlerException: Too Many Requests',
  'Too Many Requests',
]);

export interface ErrorResponseBody {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: unknown;
}

interface PrismaLikeError {
  name?: string;
  code?: string;
  meta?: Record<string, unknown>;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error, details } = this.normalize(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseBody = {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };
    if (details !== undefined) body.details = details;

    response.status(statusCode).json(body);
  }

  private normalize(exception: unknown): {
    statusCode: number;
    message: string;
    error: string;
    details?: unknown;
  } {
    // 1. Zod validation errors (nestjs-zod)
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError() as { issues?: { path: PropertyKey[]; message: string }[] };
      const issues = (zodError?.issues ?? []).map((issue) => ({
        field: issue.path.map(String).join('.') || undefined,
        message: issue.message,
      }));
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: issues[0]?.message ?? 'Оруулсан өгөгдөл буруу байна',
        error: 'Validation Error',
        details: issues,
      };
    }

    // 2. Regular Nest HTTP exceptions
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const raw = exception.getResponse();
      let message: string | undefined;
      let details: unknown;

      if (typeof raw === 'string') {
        message = raw;
      } else if (raw && typeof raw === 'object') {
        const obj = raw as { message?: unknown; error?: string };
        if (Array.isArray(obj.message)) {
          details = obj.message;
          message = typeof obj.message[0] === 'string' ? obj.message[0] : undefined;
        } else if (typeof obj.message === 'string') {
          message = obj.message;
        }
      }
      if (!message || ENGLISH_DEFAULTS.has(message)) {
        message = DEFAULT_MESSAGES[statusCode] ?? 'Алдаа гарлаа';
      }
      return { statusCode, message, error: this.errorName(statusCode), details };
    }

    // 3. Prisma known request errors (duck-typed so we do not depend on runtime class identity)
    const prismaError = exception as PrismaLikeError;
    if (prismaError?.name === 'PrismaClientKnownRequestError' && typeof prismaError.code === 'string') {
      switch (prismaError.code) {
        case 'P2002':
          return {
            statusCode: HttpStatus.CONFLICT,
            message: 'Ийм утгатай бичлэг аль хэдийн бүртгэгдсэн байна',
            error: 'Conflict',
            details: prismaError.meta?.target,
          };
        case 'P2025':
          return { statusCode: HttpStatus.NOT_FOUND, message: 'Өгөгдөл олдсонгүй', error: 'Not Found' };
        case 'P2003':
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Холбоотой өгөгдөл олдсонгүй',
            error: 'Bad Request',
          };
        default:
          break;
      }
    }

    // 4. Body-parser / multer style errors carrying a status
    const withStatus = exception as { status?: number; statusCode?: number; message?: string };
    const status = withStatus?.status ?? withStatus?.statusCode;
    if (typeof status === 'number' && status >= 400 && status < 600) {
      return {
        statusCode: status,
        message: DEFAULT_MESSAGES[status] ?? 'Алдаа гарлаа',
        error: this.errorName(status),
      };
    }

    // 5. Anything else
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: DEFAULT_MESSAGES[500],
      error: 'Internal Server Error',
    };
  }

  private errorName(statusCode: number): string {
    const name = HttpStatus[statusCode];
    if (!name) return 'Error';
    return name
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
