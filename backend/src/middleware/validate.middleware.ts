import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { errorResponse } from '../models/response.model';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = (err as any).issues || (err as any).errors || [];
        const formattedDetails = issues.map((issue: any) => ({
          field: Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path || ''),
          message: issue.message || 'Validation error',
          rule: issue.code || 'invalid'
        }));

        res.status(400).json(
          errorResponse(
            400,
            'VALIDATION_ERROR',
            'Input validation failed for request payload',
            formattedDetails
          )
        );
        return;
      }
      next(err);
    }
  };
};
