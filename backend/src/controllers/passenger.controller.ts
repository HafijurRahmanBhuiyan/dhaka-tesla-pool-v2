import { Request, Response, NextFunction } from 'express';
import { poolService } from '../services/pool.service';
import { DHAKA_ZONES, DhakaZone, RideRequest } from '../models/ride.model';
import { calculateFare, getPoolDiscountPercent } from '../services/fare.service';
import { successResponse, errorResponse, AppError } from '../models/response.model';

// Calculate Haversine distance in km between two zones
function getZoneDistanceKm(zoneAId: string, zoneBId: string): number {
  const a = DHAKA_ZONES[zoneAId];
  const b = DHAKA_ZONES[zoneBId];
  if (!a || !b) return 8.0; // fallback default

  const R = 6371; // Earth's radius in km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const sinDlat = Math.sin(dLat / 2);
  const sinDlon = Math.sin(dLon / 2);
  const val =
    sinDlat * sinDlat +
    Math.cos(lat1) * Math.cos(lat2) * sinDlon * sinDlon;
  const c = 2 * Math.atan2(Math.sqrt(val), Math.sqrt(1 - val));
  const directDistance = R * c;

  // Road factor in Dhaka (~1.3x Euclidean distance)
  return Math.max(2.5, Math.round(directDistance * 1.3 * 10) / 10);
}

export class PassengerController {
  /**
   * GET /api/v1/passenger/dashboard
   * Returns current user profile and their active ride request (if any)
   */
  public async getDashboard(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const passengerId = req.user?.id || 'usr-pass-001';

      // Find any active ride for this passenger
      const allRides = poolService.getAllRideRequests();
      const activeRide = allRides
        .filter((r) => r.passenger_id === passengerId)
        .reverse()
        .find((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED');

      let activeRideDetails: any = null;

      if (activeRide) {
        const pool = activeRide.pool_id ? poolService.getPool(activeRide.pool_id) : null;
        const pickupZone = DHAKA_ZONES[activeRide.pickup_zone];
        const dropoffZone = DHAKA_ZONES[activeRide.dropoff_zone];
        const distanceKm = getZoneDistanceKm(activeRide.pickup_zone, activeRide.dropoff_zone);

        // Active pool riders determine pool discount
        const poolRidersCount = pool ? pool.members.length : 1;
        const discountPercent = getPoolDiscountPercent(poolRidersCount);

        const fareBreakdown = calculateFare({
          baseFare: 3000,
          distanceKm,
          ratePerKm: 2500,
          poolDiscountPercent: discountPercent
        });

        activeRideDetails = {
          ...activeRide,
          pickupZoneName: pickupZone?.name || activeRide.pickup_zone,
          dropoffZoneName: dropoffZone?.name || activeRide.dropoff_zone,
          distanceKm,
          fareBreakdown,
          pool: pool
            ? {
                id: pool.id,
                driver_name: pool.driver_name,
                vehicle_model: pool.vehicle_model,
                license_plate: pool.license_plate,
                corridor: pool.corridor_name,
                available_seats: pool.available_seats,
                total_capacity: pool.seat_capacity,
                current_members_count: pool.members.length
              }
            : null
        };
      }

      res.status(200).json(
        successResponse(
          200,
          'Passenger dashboard retrieved successfully',
          {
            passenger: {
              id: req.user?.id,
              name: req.user?.full_name,
              email: req.user?.email,
              role: req.user?.role
            },
            activeRide: activeRideDetails,
            zones: Object.values(DHAKA_ZONES).map((z) => ({
              id: z.id,
              name: z.name,
              cluster: z.cluster
            }))
          }
        )
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/passenger/rides
   * Create a new ride request for the authenticated passenger
   */
  public async requestRide(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { pickup_zone, dropoff_zone, requested_seats } = req.body;

      if (!pickup_zone || !dropoff_zone) {
        throw new AppError(400, 'MISSING_ZONES', 'Both pickup_zone and dropoff_zone are required.');
      }

      if (pickup_zone === dropoff_zone) {
        throw new AppError(400, 'SAME_ZONE', 'Pickup and dropoff zones cannot be the same.');
      }

      const passengerId = req.user?.id || 'usr-pass-001';
      const passengerName = req.user?.full_name || 'Passenger';

      // Create new ride request in poolService
      const ride = poolService.createRideRequest({
        passenger_id: passengerId,
        passenger_name: passengerName,
        pickup_zone,
        dropoff_zone,
        requested_seats: requested_seats || 1
      });

      // Calculate initial solo fare
      const distanceKm = getZoneDistanceKm(pickup_zone, dropoff_zone);
      const fareBreakdown = calculateFare({
        baseFare: 3000,
        distanceKm,
        ratePerKm: 2500,
        poolDiscountPercent: 0 // initial request before match
      });

      ride.fare_bdt = fareBreakdown.fareInBdt;

      // Attempt automatic matching with available Tesla pools
      const bestMatch = poolService.findBestCompatiblePool(ride);
      let matchedPool: any = null;

      if (bestMatch.pool) {
        // Automatically allocate seat with row-level lock
        try {
          const allocation = await poolService.allocateSeatWithRowLock(
            ride.id,
            bestMatch.pool.id,
            passengerId,
            'passenger'
          );
          matchedPool = allocation.pool;
        } catch {
          // If concurrent lock fails, stays in REQUESTED state
        }
      }

      res.status(201).json(
        successResponse(
          201,
          matchedPool
            ? `Ride matched with Tesla pool on corridor: ${matchedPool.corridor_name}`
            : 'Ride request created in state REQUESTED. Waiting for compatible Tesla pool.',
          {
            ride: {
              ...ride,
              distanceKm,
              fareBreakdown
            },
            matchedPool: matchedPool
              ? {
                  id: matchedPool.id,
                  driver_name: matchedPool.driver_name,
                  vehicle_model: matchedPool.vehicle_model,
                  license_plate: matchedPool.license_plate,
                  available_seats: matchedPool.available_seats
                }
              : null
          }
        )
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/passenger/rides/:id/cancel
   * Cancel an active ride request
   */
  public async cancelRide(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const rideId = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);
      const passengerId = req.user?.id || 'usr-pass-001';

      const ride = poolService.getRideRequest(rideId);
      if (!ride) {
        throw new AppError(404, 'RIDE_NOT_FOUND', `Ride '${rideId}' not found.`);
      }

      if (ride.passenger_id !== passengerId) {
        throw new AppError(403, 'FORBIDDEN', 'You cannot cancel another passenger’s ride.');
      }

      const result = await poolService.transitionRideStatus(
        rideId,
        'CANCELLED',
        passengerId,
        'passenger',
        'Cancelled by passenger'
      );

      res.status(200).json(
        successResponse(200, 'Ride successfully cancelled.', result)
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/passenger/rides/:id
   * Poll live status of a specific passenger ride
   */
  public async getRideStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const rideId = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);
      const passengerId = req.user?.id;

      const ride = poolService.getRideRequest(rideId);
      if (!ride) {
        throw new AppError(404, 'RIDE_NOT_FOUND', `Ride '${rideId}' not found.`);
      }

      if (passengerId && ride.passenger_id !== passengerId) {
        throw new AppError(403, 'FORBIDDEN', 'Access denied to this ride status.');
      }

      const pool = ride.pool_id ? poolService.getPool(ride.pool_id) : null;
      const pickupZone = DHAKA_ZONES[ride.pickup_zone];
      const dropoffZone = DHAKA_ZONES[ride.dropoff_zone];
      const distanceKm = getZoneDistanceKm(ride.pickup_zone, ride.dropoff_zone);

      const poolRidersCount = pool ? pool.members.length : 1;
      const discountPercent = getPoolDiscountPercent(poolRidersCount);

      const fareBreakdown = calculateFare({
        baseFare: 3000,
        distanceKm,
        ratePerKm: 2500,
        poolDiscountPercent: discountPercent
      });

      res.status(200).json(
        successResponse(200, 'Ride status retrieved', {
          ride: {
            ...ride,
            pickupZoneName: pickupZone?.name || ride.pickup_zone,
            dropoffZoneName: dropoffZone?.name || ride.dropoff_zone,
            distanceKm,
            fareBreakdown,
            pool: pool
              ? {
                  id: pool.id,
                  driver_name: pool.driver_name,
                  vehicle_model: pool.vehicle_model,
                  license_plate: pool.license_plate,
                  corridor: pool.corridor_name,
                  available_seats: pool.available_seats,
                  total_capacity: pool.seat_capacity,
                  current_members_count: pool.members.length
                }
              : null
          }
        })
      );
    } catch (err) {
      next(err);
    }
  }
}

export const passengerController = new PassengerController();
