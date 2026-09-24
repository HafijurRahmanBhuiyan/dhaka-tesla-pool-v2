import { Router } from 'express';
import { rideController } from '../controllers/ride.controller';
import { validateBody } from '../middleware/validate.middleware';
import { createRideSchema, transitionRideSchema, matchRideSchema } from '../models/ride.model';

const router = Router();

// Pool listing and concurrency simulation
router.get('/pools', (req, res) => rideController.getPools(req, res));
router.post('/pools/concurrency-race', (req, res, next) =>
  rideController.simulateConcurrencyRace(req, res, next)
);

// Pure Fare Calculation (All amounts in integer paisa)
router.post('/calculate-fare', (req, res, next) =>
  rideController.calculateFare(req, res, next)
);

// Ride Request Creation
router.post(
  '/request',
  validateBody(createRideSchema),
  (req, res, next) => rideController.createRideRequest(req, res, next)
);

// Matching & Transactional Row-Level Lock Seat Allocation
router.post(
  '/:id/match',
  validateBody(matchRideSchema),
  (req, res, next) => rideController.matchAndAllocateSeat(req, res, next)
);

// Explicit State Machine Transition
router.post(
  '/:id/transition',
  validateBody(transitionRideSchema),
  (req, res, next) => rideController.transitionRideStatus(req, res, next)
);

// State Transition Audit History
router.get('/:id/history', (req, res) => rideController.getAuditHistory(req, res));
router.get('/audit/all', (req, res) => rideController.getAuditHistory(req, res));

export default router;
