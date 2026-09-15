import { createZodDto } from 'nestjs-zod';
import { MessageListQuerySchema, SendMessageSchema } from '@law-firm/shared';

export class MessageListQueryDto extends createZodDto(MessageListQuerySchema) {}
export class SendMessageDto extends createZodDto(SendMessageSchema) {}
