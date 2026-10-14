import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env';
import { SettingsModule } from '../settings/settings.module';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { MAIL_TRANSPORT } from './mail.types';
import { createNodemailerTransport } from './nodemailer.transport';

/**
 * Global, because almost every module has something to tell someone: the domain listeners, the
 * daily reminders, auth and the admin panel all send through the one service.
 */
@Global()
@Module({
  imports: [SettingsModule],
  controllers: [MailController],
  providers: [
    MailService,
    {
      provide: MAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => createNodemailerTransport(config),
    },
  ],
  exports: [MailService],
})
export class MailModule {}
