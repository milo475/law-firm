import { AppController } from './app.controller';
import { createConfigMock, createPrismaMock } from './common/testing/mocks';

/**
 * The database name is what stops a screenshot run from photographing the dev database, so it has
 * to be there outside production — and has to stay out of a public production answer.
 */
describe('Health endpoint', () => {
  const build = (env: Parameters<typeof createConfigMock>[0] = {}) => {
    const prisma = createPrismaMock();
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    return { prisma, controller: new AppController(prisma as never, createConfigMock(env)) };
  };

  it('names the database outside production', async () => {
    const { controller } = build({ DATABASE_URL: 'postgresql://lawfirm:lawfirm@localhost:5432/lawfirm_test?schema=public' });
    await expect(controller.health()).resolves.toMatchObject({ status: 'ok', database: 'up', databaseName: 'lawfirm_test' });
  });

  it('keeps the name out of the answer in production', async () => {
    const { controller } = build({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://user:pass@db.internal:5432/railway' });
    await expect(controller.health()).resolves.toMatchObject({ databaseName: undefined });
  });

  it('reports a degraded service when the database does not answer', async () => {
    const { prisma, controller } = build();
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));
    await expect(controller.health()).resolves.toMatchObject({ status: 'degraded', database: 'down' });
  });
});
