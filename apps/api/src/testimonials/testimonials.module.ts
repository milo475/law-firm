import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminTestimonialsController } from './admin-testimonials.controller';
import { TestimonialNotificationsListener } from './testimonial-notifications.listener';
import { TestimonialsController } from './testimonials.controller';
import { TestimonialsService } from './testimonials.service';

@Module({
  imports: [NotificationsModule],
  controllers: [TestimonialsController, AdminTestimonialsController],
  providers: [TestimonialsService, TestimonialNotificationsListener],
  exports: [TestimonialsService],
})
export class TestimonialsModule {}
