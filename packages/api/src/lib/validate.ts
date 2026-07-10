/**
 * validate.ts — Express middleware factory.
 * Usage: router.post('/path', validate(MySchema), handler)
 */
import { type RequestHandler } from 'express';
import { type ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body'): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = (result.error as ZodError).errors.map(e => ({
        field:   e.path.join('.'),
        message: e.message,
      }));
      res.status(400).json({ error: 'Validation failed', errors });
      return;
    }
    // Replace raw input with the parsed (coerced + stripped) value
    req[source] = result.data;
    next();
  };
}
