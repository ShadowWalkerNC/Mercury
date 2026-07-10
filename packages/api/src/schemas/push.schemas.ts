import { z } from 'zod';

const KeysSchema = z.object({
  p256dh: z.string().min(1),
  auth:   z.string().min(1),
});

export const PushSubscribeSchema = z.object({
  endpoint:       z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys:           KeysSchema,
});

export const PushUnsubscribeSchema = z.object({
  endpoint: z.string().url(),
});
