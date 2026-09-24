import { Request, Response, NextFunction } from 'express';
import { AppError, errorResponse } from '../models/response.model';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // If it's our structured AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json(
      errorResponse(err.statusCode, err.code, err.message, err.details)
    );
    return;
  }

  // Syntax error from JSON body parser
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json(
      errorResponse(400, 'BAD_REQUEST_JSON', 'Malformed JSON in request body.')
    );
    return;
  }

  console.error('Unhandled Server Error:', err);

  const statusCode = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected internal server error occurred.'
      : err.message || 'Internal server error';

  res.status(statusCode).json(
    errorResponse(statusCode, 'INTERNAL_SERVER_ERROR', message)
  );
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json(
    errorResponse(
      404,
      'ROUTE_NOT_FOUND',
      `Cannot ${req.method} ${req.originalUrl}. Route does not exist.`
    )
  );
};
