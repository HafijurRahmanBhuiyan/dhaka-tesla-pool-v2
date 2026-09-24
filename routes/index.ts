import { Router } from 'express';
import authRoutes from './auth.routes';
import passengerRoutes from './passenger.routes';
import driverRoutes from './driver.routes';
import healthRoutes from './health.routes';
import rideRoutes from './ride.routes';

const router = Router();

// 1. Healthcheck Endpoint (mounted at /health and /api/v1/health)
router.use('/health', healthRoutes);

// 2. Authentication & Profile Routes
router.use('/api/v1/auth', authRoutes);

// 3. Role-Protected Domain Routes
router.use('/api/v1/passenger', passengerRoutes);
router.use('/api/v1/driver', driverRoutes);

// 4. Ride Lifecycle & Matching Engine (State Machine + Row Locks)
router.use('/api/v1/rides', rideRoutes);

export default router;
