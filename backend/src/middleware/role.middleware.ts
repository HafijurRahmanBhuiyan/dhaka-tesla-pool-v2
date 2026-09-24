import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/user.model';
import { errorResponse } from '../models/response.model';

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(
        errorResponse(
          401,
          'UNAUTHORIZED',
          'User session not authenticated. authenticateJwt middleware must be applied first.'
        )
      );
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json(
        errorResponse(
          403,
          'FORBIDDEN',
          `Access forbidden: Endpoint requires [${allowedRoles.join(' or ')}] role, but you are logged in as [${req.user.role}].`,
          {
            userRole: req.user.role,
            requiredRoles: allowedRoles
          }
        )
      );
      return;
    }

    next();
  };
};

export const requirePassenger = requireRole('passenger');
export const requireDriver = requireRole('driver');
export const requireAdmin = requireRole('admin');
