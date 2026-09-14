import { Logger, NotFoundException, type ArgumentsHost } from '@nestjs/common';
import { LoginSchema } from '@law-firm/shared';
import { ZodValidationException } from 'nestjs-zod';
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

  it('formats zod validation errors as 400 with field details', () => {
    const parsed = LoginSchema.safeParse({ identifier: '', password: '' });
    const { status, body } = run(new ZodValidationException(parsed.error as never));
    expect(status).toBe(400);
    expect(body.error).toBe('Validation Error');
    expect(body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'identifier' }), expect.objectContaining({ field: 'password' })]),
    );
    expect(body.message).toBe('И-мэйл эсвэл утасны дугаараа оруулна уу');
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
    expect(body.details).toEqual(['email']);
  });

  it('hides internals of unexpected errors behind a generic 500', () => {
    const { status, body } = run(new Error('secret stack info'));
    expect(status).toBe(500);
    expect(body.message).not.toContain('secret');
  });
});
