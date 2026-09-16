import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';
import type { Env } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<Env, true>);
  const logger = new Logger('Bootstrap');

  const nodeEnv = config.get('NODE_ENV', { infer: true });
  const port = config.get('PORT', { infer: true });
  const origins = config
    .get('CORS_ORIGIN', { infer: true })
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Behind a reverse proxy in production so req.ip / secure cookies work. Count the hops the
  // request really takes (Railway edge → web same-origin proxy → api = 2); too many hops would
  // let a client spoof X-Forwarded-For, too few makes the rate limiter see one shared IP.
  app.set('trust proxy', nodeEnv === 'production' ? config.get('TRUST_PROXY_HOPS', { infer: true }) : false);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.enableShutdownHooks();

  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Law Firm API')
      .setDescription('Хуулийн фирмийн вэб сайт + харилцагчийн порталын REST API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .addCookieAuth('refresh_token')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, cleanupOpenApiDoc(document), {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // '::' also accepts IPv4, and is required by Railway's IPv6-only private network.
  await app.listen(port, '::');
  logger.log(`API listening on port ${port} (${nodeEnv})`);
  if (nodeEnv !== 'production') logger.log(`Swagger UI: http://localhost:${port}/docs`);
}

void bootstrap();
