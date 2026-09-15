import { createZodDto } from 'nestjs-zod';
import { NotificationListQuerySchema } from '@law-firm/shared';

export class NotificationListQueryDto extends createZodDto(NotificationListQuerySchema) {}
