import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { successResponse } from '../models/response.model';
import { SignupInput, LoginInput } from '../models/user.model';

export class AuthController {
  public async signup(
    req: Request<{}, {}, SignupInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await authService.signup(req.body);
      res.status(201).json(
        successResponse(
          201,
          `Account successfully created for ${result.user.full_name} with role '${result.user.role}'`,
          result
        )
      );
    } catch (err) {
      next(err);
    }
  }

  public async login(
    req: Request<{}, {}, LoginInput>,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await authService.login(req.body);
      res.status(200).json(
        successResponse(
          200,
          `Login successful. Welcome back, ${result.user.full_name}!`,
          result
        )
      );
    } catch (err) {
      next(err);
    }
  }

  public async getMe(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthenticated' });
        return;
      }
      const user = await authService.getCurrentUser(req.user.id);
      res.status(200).json(
        successResponse(
          200,
          'Authenticated profile retrieved successfully',
          { user }
        )
      );
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
