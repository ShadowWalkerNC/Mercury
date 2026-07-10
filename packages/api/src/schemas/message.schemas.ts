import { z } from 'zod';

const AttachmentSchema = z.object({
  key:  z.string().min(1),
  url:  z.string().url(),
  name: z.string().min(1).max(255),
  size: z.number().int().positive().max(100 * 1024 * 1024), // 100 MB hard cap
  mime: z.string().min(1).max(127),
});

export const SendMessageSchema = z.object({
  content:    z.string().max(4000).default(''),
  attachment: AttachmentSchema.optional(),
}).refine(d => d.content.trim().length > 0 || d.attachment !== undefined, {
  message: 'Message must have content or an attachment',
});

export const EditMessageSchema = z.object({
  content: z
    .string()
    .min(1,    'Content cannot be empty')
    .max(4000, 'Message too long'),
});

export const AddReactionSchema = z.object({
  emoji: z
    .string()
    .min(1)
    .max(10, 'Emoji too long'),
});
