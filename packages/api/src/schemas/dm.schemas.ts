import { z } from 'zod';

export const OpenDMSchema = z.object({
  recipient_id: z.string().uuid('Invalid recipient id'),
});
