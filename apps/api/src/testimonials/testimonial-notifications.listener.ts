import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Role } from '@law-firm/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { TESTIMONIAL_EVENTS, type TestimonialCreatedEvent, type TestimonialRef, type TestimonialReviewedEvent } from './testimonial.events';

const TYPE = 'TESTIMONIAL';

/** Staff hear about a new testimonial waiting for review; the author hears what was decided. */
@Injectable()
export class TestimonialNotificationsListener {
  private readonly logger = new Logger(TestimonialNotificationsListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @OnEvent(TESTIMONIAL_EVENTS.created)
  async onCreated({ testimonial }: TestimonialCreatedEvent): Promise<void> {
    await this.safely(testimonial, async () => {
      const staff = await this.prisma.user.findMany({
        where: { role: { in: [Role.ADMIN, Role.LAWYER] }, isActive: true },
        select: { id: true },
      });
      await this.notifications.createMany(
        staff.map((member) => ({
          userId: member.id,
          type: TYPE,
          title: 'Шинэ сэтгэгдэл хүлээгдэж байна',
          body: [testimonial.authorName, testimonial.caseNumber].filter(Boolean).join(' · '),
          link: '/admin/testimonials',
          actorId: testimonial.authorUserId,
        })),
      );
    });
  }

  @OnEvent(TESTIMONIAL_EVENTS.published)
  async onPublished({ testimonial, actorId }: TestimonialReviewedEvent): Promise<void> {
    if (!testimonial.authorUserId) return;
    await this.safely(testimonial, () =>
      this.notifications.createMany([
        {
          userId: testimonial.authorUserId as string,
          type: TYPE,
          title: 'Таны сэтгэгдэл нийтлэгдлээ',
          body: 'Сэтгэгдлийг тань сайтад нийтэллээ. Хүссэн үедээ нийтлэхийг цуцалж болно.',
          link: '/portal/profile',
          actorId,
        },
      ]),
    );
  }

  @OnEvent(TESTIMONIAL_EVENTS.rejected)
  async onRejected({ testimonial, actorId }: TestimonialReviewedEvent): Promise<void> {
    if (!testimonial.authorUserId) return;
    await this.safely(testimonial, () =>
      this.notifications.createMany([
        {
          userId: testimonial.authorUserId as string,
          type: TYPE,
          title: 'Сэтгэгдлийг тань нийтлээгүй',
          body: 'Сэтгэгдлийг тань хянаад нийтлэхгүй байхаар шийдлээ. Дэлгэрэнгүйг хуульчаасаа асууна уу.',
          link: '/portal/profile',
          actorId,
        },
      ]),
    );
  }

  private async safely(testimonial: TestimonialRef, work: () => Promise<unknown>): Promise<void> {
    try {
      await work();
    } catch (error) {
      this.logger.error(`Could not notify about testimonial ${testimonial.id}: ${(error as Error).message}`);
    }
  }
}
