import { Router } from 'express';
import { driverController } from '../controllers/driver.controller';
import { authenticateJwt } from '../middleware/auth.middleware';
import { requireDriver } from '../middleware/role.middleware';

const router = Router();

// All routes under /driver require valid JWT and Driver role
router.use(authenticateJwt);
router.use(requireDriver);

// Jashim's Driver Console & Bullet Manifest
router.get('/console', driverController.getConsole);

// Ride State Transition (Arrived -> Start -> Complete)
router.post('/rides/:id/transition', driverController.transitionRide);

// Advance entire pool through state machine
router.post('/pool/advance', driverController.advancePool);

// Reset pool for replay
router.post('/pool/reset', driverController.resetPool);

// Update status
router.post('/pools/:id/status', driverController.updatePoolStatus);

export default router;
