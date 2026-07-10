import { z } from 'zod';

export const RegisterSchema = z.object({
  username: z
    .string()
    .min(2,  'Username must be at least 2 characters')
    .max(32, 'Username must be at most 32 characters')
    .regex(/^[a-z0-9_]+$/i, 'Username may only contain letters, numbers and underscores'),
  password: z
    .string()
    .min(8,   'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  display_name: z.string().max(80).optional(),
});

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  totp_code: z.string().length(6).regex(/^\d+$/).optional(),
});

export const RefreshSchema = z.object({
  refresh_token: z.string().min(1),
});
