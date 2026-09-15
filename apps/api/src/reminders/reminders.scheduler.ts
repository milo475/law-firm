import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import type { Env } from '../config/env';
import { RemindersService } from './reminders.service';

export const DAILY_REMINDERS_JOB = 'daily-reminders';

/** Registers the daily reminder cron from REMINDERS_CRON. Not scheduled in tests or when REMINDERS_ENABLED=false. */
@Injectable()
export class RemindersScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(RemindersScheduler.name);

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly registry: SchedulerRegistry,
    private readonly reminders: RemindersService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.get('NODE_ENV', { infer: true }) === 'test' || !this.config.get('REMINDERS_ENABLED', { infer: true })) {
      this.logger.log('Daily reminders are disabled');
      return;
    }
    const expression = this.config.get('REMINDERS_CRON', { infer: true });
    const job = CronJob.from({ cronTime: expression, onTick: () => void this.run(), start: false });
    this.registry.addCronJob(DAILY_REMINDERS_JOB, job);
    job.start();
    this.logger.log(`Daily reminders scheduled (${expression}), next run ${job.nextDate().toISO()}`);
  }

  private async run(): Promise<void> {
    try {
      await this.reminders.runDaily();
    } catch (error) {
      this.logger.error(`Daily reminders failed: ${(error as Error).message}`);
    }
  }
}
