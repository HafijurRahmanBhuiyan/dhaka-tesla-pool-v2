import { Router } from 'express';
import { passengerController } from '../controllers/passenger.controller';
import { authenticateJwt } from '../middleware/auth.middleware';
import { requirePassenger } from '../middleware/role.middleware';
import { poolService } from '../services/pool.service';
import { RideStateMachine } from '../services/stateMachine.service';
import { successResponse } from '../models/response.model';

const router = Router();

// All routes under /passenger require valid JWT and Passenger role
router.use(authenticateJwt);
router.use(requirePassenger);

router.get('/dashboard', passengerController.getDashboard);
router.post('/rides', passengerController.requestRide);
router.get('/rides/:id', passengerController.getRideStatus);
router.post('/rides/:id/cancel', passengerController.cancelRide);

// Simulation helper for test driving the live polling transitions
router.post('/rides/:id/advance-sim', async (req, res, next) => {
  try {
    const rideId = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);
    const ride = poolService.getRideRequest(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    const nextSteps: Record<string, string> = {
      REQUESTED: 'MATCHED',
      MATCHED: 'DRIVER_ARRIVED',
      ACCEPTED: 'DRIVER_ARRIVED',
      DRIVER_ARRIVED: 'STARTED',
      STARTED: 'COMPLETED'
    };

    const target = nextSteps[ride.status];
    if (!target) {
      return res.status(400).json({
        success: false,
        message: `Cannot advance further from status ${ride.status}`
      });
    }

    // If transitioning to MATCHED and pool not assigned, allocate pool
    if (target === 'MATCHED' && !ride.pool_id) {
      const best = poolService.findBestCompatiblePool(ride);
      if (best.pool) {
        await poolService.allocateSeatWithRowLock(
          ride.id,
          best.pool.id,
          req.user?.id || 'sim-user',
          'passenger'
        );
      }
    } else {
      await poolService.transitionRideStatus(
        ride.id,
        target as any,
        req.user?.id || 'sim-user',
        'passenger',
        'Advanced via simulation test button'
      );
    }

    return passengerController.getRideStatus(req, res, next);
  } catch (e) {
    next(e);
  }
});

export default router;
