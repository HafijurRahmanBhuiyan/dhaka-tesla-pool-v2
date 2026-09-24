import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../models/user.model';
import { errorResponse } from '../models/response.model';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_32chars';

// Extend Express Request interface with authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticateJwt = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json(
      errorResponse(
        401,
        'UNAUTHORIZED',
        'Authorization header missing. Please provide a Bearer token.'
      )
    );
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json(
      errorResponse(
        401,
        'MALFORMED_TOKEN',
        "Invalid authorization header format. Format must be 'Bearer <token>'."
      )
    );
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json(
        errorResponse(
          401,
          'TOKEN_EXPIRED',
          'JWT access token has expired. Please log in again.'
        )
      );
      return;
    }

    res.status(401).json(
      errorResponse(
        401,
        'INVALID_TOKEN',
        'Authentication failed: Invalid or tampered JWT access token.'
      )
    );
  }
};
