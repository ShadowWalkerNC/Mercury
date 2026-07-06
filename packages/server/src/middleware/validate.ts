import type { Request, Response, NextFunction } from 'express';

type Rule = {
  type: 'string' | 'number' | 'boolean';
  min?: number;
  max?: number;
  optional?: boolean;
};

type Schema = Record<string, Rule>;

export function validateBody(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    for (const [field, rule] of Object.entries(schema)) {
      const value = (req.body as Record<string, unknown>)[field];

      if (value === undefined || value === null) {
        if (!rule.optional) errors.push(`${field} is required`);
        continue;
      }

      if (typeof value !== rule.type) {
        errors.push(`${field} must be a ${rule.type}`);
        continue;
      }

      if (rule.type === 'string') {
        const str = value as string;
        if (rule.min !== undefined && str.length < rule.min)
          errors.push(`${field} must be at least ${rule.min} characters`);
        if (rule.max !== undefined && str.length > rule.max)
          errors.push(`${field} must be at most ${rule.max} characters`);
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ error: errors.join(', ') });
      return;
    }

    next();
  };
}
