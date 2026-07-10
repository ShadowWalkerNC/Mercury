import { z } from 'zod';

export const CreateSpaceSchema = z.object({
  name: z
    .string()
    .min(1,  'Space name is required')
    .max(100, 'Space name too long'),
  icon: z.string().url().optional().nullable(),
});

export const UpdateSpaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().url().optional().nullable(),
});

export const CreateChannelSchema = z.object({
  name: z
    .string()
    .min(1,  'Channel name is required')
    .max(100, 'Channel name too long')
    .regex(/^[a-z0-9-_]+$/i, 'Channel name may only contain letters, numbers, hyphens and underscores'),
  type: z.enum(['text', 'voice']).default('text'),
});

export const InviteSchema = z.object({
  user_id: z.string().uuid('Invalid user id'),
});

export const UpdateMemberSchema = z.object({
  role: z.enum(['admin', 'member']),
});
