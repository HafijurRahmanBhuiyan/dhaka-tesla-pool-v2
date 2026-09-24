import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateBody } from '../middleware/validate.middleware';
import { authenticateJwt } from '../middleware/auth.middleware';
import { signupSchema, loginSchema } from '../models/user.model';

const router = Router();

// Public auth routes with Zod validation
router.post('/signup', validateBody(signupSchema), authController.signup);
router.post('/login', validateBody(loginSchema), authController.login);

// Protected auth route (requires valid JWT)
router.get('/me', authenticateJwt, authController.getMe);

export default router;
