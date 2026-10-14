import { ForbiddenException, Logger, NotFoundException, type ArgumentsHost } from '@nestjs/common';
import { LoginSchema, RegisterSchema } from '@law-firm/shared';
import { ZodValidationException } from 'nestjs-zod';
import { err } from '../errors/app-error';
import { AllExceptionsFilter } from './http-exception.filter';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  const run = (exception: unknown) => {
    const json = jest.fn();
    const status = jest.fn((_code: number) => ({ json }));
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'GET', url: '/cases/abc' }),
      }),
    } as unknown as ArgumentsHost;
    filter.catch(exception, host);
    return { status: status.mock.calls[0][0], body: json.mock.calls[0][0] };
  };

  it('replaces English default messages with Mongolian ones and keeps the response shape', () => {
    const { status, body } = run(new NotFoundException());
    expect(status).toBe(404);
    expect(body).toMatchObject({
      statusCode: 404,
      message: 'Хуудас эсвэл өгөгдөл олдсонгүй',
      error: 'Not Found',
      path: '/cases/abc',
    });
    expect(new Date(body.timestamp).getTime()).not.toBeNaN();
  });

  it('keeps custom Mongolian messages untouched', () => {
    const { body } = run(new NotFoundException('Хэрэг олдсонгүй'));
    expect(body.message).toBe('Хэрэг олдсонгүй');
  });

  it('formats zod validation errors as 400 with the failing field', () => {
    const parsed = LoginSchema.safeParse({ identifier: '', password: '' });
    const { status, body } = run(new ZodValidationException(parsed.error as never));
    expect(status).toBe(400);
    expect(body.error).toBe('Validation Error');
    expect(body.code).toBe('validation.minLength');
    expect(body.details).toEqual({ field: 'identifier', min: 1 });
    expect(body.message).toBe('И-мэйл эсвэл утасны дугаараа оруулна уу');
  });

  it('names the rule and the limit a zod issue broke, so the client can word it itself', () => {
    const parsed = RegisterSchema.safeParse({ email: 'a@b.mn', password: 'short1', firstName: 'Болд', lastName: 'Бат' });
    const { body } = run(new ZodValidationException(parsed.error as never));
    expect(body.code).toBe('validation.minLength');
    expect(body.details).toEqual({ field: 'password', min: 8 });
  });

  it('keeps the code and the translation values of a thrown app error', () => {
    const { status, body } = run(
      new ForbiddenException(err('documentRequest.tooManyFiles', 'Нэг удаад 20-аас ихгүй файл илгээнэ үү', { max: 20 })),
    );
    expect(status).toBe(403);
    expect(body.code).toBe('documentRequest.tooManyFiles');
    expect(body.message).toBe('Нэг удаад 20-аас ихгүй файл илгээнэ үү');
    expect(body.details).toEqual({ max: 20 });
  });

  it('falls back to the code for the status when an exception carries none', () => {
    expect(run(new NotFoundException()).body.code).toBe('http.notFound');
    expect(run(new ForbiddenException('Энэ хэргийг үзэх эрх танд байхгүй байна')).body.code).toBe('http.forbidden');
  });

  it('maps Prisma unique-constraint errors to 409', () => {
    const prismaError = Object.assign(new Error('Unique constraint failed'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2002',
      meta: { target: ['email'] },
    });
    const { status, body } = run(prismaError);
    expect(status).toBe(409);
    expect(body.error).toBe('Conflict');
    expect(body.code).toBe('data.duplicate');
    expect(body.details).toEqual({ field: 'email' });
  });

  it('hides internals of unexpected errors behind a generic 500', () => {
    const { status, body } = run(new Error('secret stack info'));
    expect(status).toBe(500);
    expect(body.code).toBe('http.serverError');
    expect(body.message).not.toContain('secret');
  });
});
