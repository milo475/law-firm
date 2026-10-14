import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiErrorBody, ErrorCode, ErrorDetails } from '@law-firm/shared';
import * as Sentry from '@sentry/nestjs';
import type { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';

/**
 * Every failure leaves here in one shape: a status, a stable `code` the caller can translate, the
 * Mongolian wording as a fallback, and `details` holding only what a translation needs to fill in.
 */

/** Used when an exception carries nothing but the English default Nest puts there. */
const DEFAULT_ERRORS: Record<number, { code: ErrorCode; message: string }> = {
  400: { code: 'http.badRequest', message: 'Хүсэлт буруу байна' },
  401: { code: 'http.unauthorized', message: 'Нэвтрэх шаардлагатай' },
  403: { code: 'http.forbidden', message: 'Энэ үйлдлийг хийх эрх танд байхгүй байна' },
  404: { code: 'http.notFound', message: 'Хуудас эсвэл өгөгдөл олдсонгүй' },
  405: { code: 'http.methodNotAllowed', message: 'Зөвшөөрөгдөөгүй хүсэлт' },
  409: { code: 'http.conflict', message: 'Өгөгдөл давхардаж байна' },
  413: { code: 'http.payloadTooLarge', message: 'Файлын хэмжээ хэт их байна' },
  415: { code: 'http.unsupportedMediaType', message: 'Дэмжигдээгүй файлын төрөл' },
  422: { code: 'http.unprocessable', message: 'Өгөгдөл боловсруулах боломжгүй' },
  429: { code: 'http.tooManyRequests', message: 'Хэт олон хүсэлт илгээлээ. Түр хүлээгээд дахин оролдоно уу' },
  500: { code: 'http.serverError', message: 'Серверийн алдаа гарлаа. Дахин оролдоно уу' },
  503: { code: 'http.unavailable', message: 'Үйлчилгээ түр ажиллахгүй байна' },
};

const FALLBACK = { code: 'http.serverError' as ErrorCode, message: 'Алдаа гарлаа' };

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

interface PrismaLikeError {
  name?: string;
  code?: string;
  meta?: Record<string, unknown>;
}

/** The part of a zod issue this filter reads; zod's own types are not imported into the API. */
interface ZodIssue {
  code: string;
  path: PropertyKey[];
  message: string;
  origin?: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
  expected?: string;
  format?: string;
}

/**
 * A failed rule becomes `validation.<rule>` plus the numbers that rule used, so «at least 8
 * characters» can be written in the reader's language instead of shipped from here in Mongolian.
 */
function validationFailure(issue: ZodIssue): { code: ErrorCode; details: ErrorDetails } {
  const field = issue.path.map(String).join('.');
  const details: ErrorDetails = field ? { field } : {};
  switch (issue.code) {
    case 'too_small':
      return issue.origin === 'string'
        ? { code: 'validation.minLength', details: { ...details, min: Number(issue.minimum) } }
        : { code: 'validation.min', details: { ...details, min: Number(issue.minimum) } };
    case 'too_big':
      return issue.origin === 'string'
        ? { code: 'validation.maxLength', details: { ...details, max: Number(issue.maximum) } }
        : { code: 'validation.max', details: { ...details, max: Number(issue.maximum) } };
    case 'invalid_type':
      return { code: 'validation.invalidType', details };
    case 'invalid_format':
      return { code: 'validation.format', details: issue.format ? { ...details, format: issue.format } : details };
    case 'invalid_value':
      return { code: 'validation.invalidOption', details };
    default:
      return { code: 'validation.failed', details };
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, code, message, error, details } = this.normalize(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      // Only server failures reach Sentry; a 4xx is the caller being wrong, and reporting those
      // would bury the ones nobody expected. The route, not the URL, so no query string travels.
      Sentry.captureException(exception, {
        tags: { route: request.route?.path ?? request.path, method: request.method, status: String(statusCode), code },
      });
    }

    const body: ApiErrorBody = {
      statusCode,
      code,
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
    code: string;
    message: string;
    error: string;
    details?: unknown;
  } {
    // 1. Zod validation errors (nestjs-zod). The client checks the same schema before sending, so
    //    the first failing field is what there is to report.
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError() as { issues?: ZodIssue[] };
      const [issue] = zodError?.issues ?? [];
      const failure = issue ? validationFailure(issue) : { code: 'validation.failed' as ErrorCode, details: undefined };
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: failure.code,
        message: issue?.message ?? 'Оруулсан өгөгдөл буруу байна',
        error: 'Validation Error',
        details: failure.details,
      };
    }

    // 2. Regular Nest HTTP exceptions — ours carry `err(code, message, details)` as the body.
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const raw = exception.getResponse();
      const fallback = DEFAULT_ERRORS[statusCode] ?? FALLBACK;
      let message: string | undefined;
      let code: string | undefined;
      let details: unknown;

      if (typeof raw === 'string') {
        message = raw;
      } else if (raw && typeof raw === 'object') {
        const obj = raw as { message?: unknown; code?: unknown; details?: unknown };
        if (typeof obj.code === 'string') code = obj.code;
        if (obj.details !== undefined) details = obj.details;
        if (Array.isArray(obj.message)) message = typeof obj.message[0] === 'string' ? obj.message[0] : undefined;
        else if (typeof obj.message === 'string') message = obj.message;
      }
      if (!message || ENGLISH_DEFAULTS.has(message)) message = fallback.message;
      return { statusCode, code: code ?? fallback.code, message, error: this.errorName(statusCode), details };
    }

    // 3. Prisma known request errors (duck-typed so we do not depend on runtime class identity)
    const prismaError = exception as PrismaLikeError;
    if (prismaError?.name === 'PrismaClientKnownRequestError' && typeof prismaError.code === 'string') {
      const target = prismaError.meta?.target;
      const field = Array.isArray(target) ? String(target[0]) : typeof target === 'string' ? target : undefined;
      switch (prismaError.code) {
        case 'P2002':
          return {
            statusCode: HttpStatus.CONFLICT,
            code: 'data.duplicate',
            message: 'Ийм утгатай бичлэг аль хэдийн бүртгэгдсэн байна',
            error: 'Conflict',
            details: field ? { field } : undefined,
          };
        case 'P2025':
          return { statusCode: HttpStatus.NOT_FOUND, code: 'data.notFound', message: 'Өгөгдөл олдсонгүй', error: 'Not Found' };
        case 'P2003':
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            code: 'data.relatedNotFound',
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
      const fallback = DEFAULT_ERRORS[status] ?? FALLBACK;
      return { statusCode: status, code: fallback.code, message: fallback.message, error: this.errorName(status) };
    }

    // 5. Anything else
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: DEFAULT_ERRORS[500].code,
      message: DEFAULT_ERRORS[500].message,
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
