import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  display_name: z.string().max(80).nullable().optional(),
  avatar:       z.string().max(512).nullable().optional(),
});
