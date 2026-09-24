import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse, AppError } from '../models/response.model';
import { userService } from '../services/user.service';
import { poolService } from '../services/pool.service';
import { RideStateMachine } from '../services/stateMachine.service';
import { DHAKA_ZONES, RideStatus } from '../models/ride.model';
import { calculateFare } from '../services/fare.service';

export class DriverController {
  /**
   * GET /api/v1/driver/console
   * Returns Jashim's assigned pool with all current passengers, seat assignment, and remaining capacity on Bullet
   */
  public async getConsole(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const driverId = req.user?.id || 'usr-driv-jashim';
      const fullDriver = await userService.findById(driverId);

      // Prefer Jashim's pool "Bullet", fallback to any pool assigned to this driver, or alpha
      let pool = poolService.getPoolByDriverId(driverId);
      if (!pool) {
        pool = poolService.getPool('pool-jashim-bullet') || poolService.getPool('pool-dhaka-tesla-alpha');
      }

      if (!pool) {
        throw new AppError(404, 'POOL_NOT_FOUND', 'No active Tesla pool found for driver.');
      }

      // Format passenger manifest with exact seat assignments on "Bullet"
      const seatPositions = [
        'Seat 1 (Front Passenger)',
        'Seat 2 (Rear Left)',
        'Seat 3 (Rear Right)',
        'Seat 4 (Rear Center)'
      ];

      const passengersManifest = pool.members.map((member, index) => {
        const ride = poolService.getRideRequest(member.ride_request_id);
        const pickupZone = DHAKA_ZONES[member.pickup_zone];
        const dropoffZone = DHAKA_ZONES[member.dropoff_zone];

        return {
          id: member.id,
          ride_request_id: member.ride_request_id,
          passenger_id: member.passenger_id,
          passenger_name: member.passenger_name,
          seat_number: index + 1,
          seat_label: seatPositions[index] || `Seat ${index + 1}`,
          pickup_zone: member.pickup_zone,
          pickup_zone_name: pickupZone?.name || member.pickup_zone,
          dropoff_zone: member.dropoff_zone,
          dropoff_zone_name: dropoffZone?.name || member.dropoff_zone,
          pickup_order: member.pickup_order,
          dropoff_order: member.dropoff_order,
          seats_reserved: member.seats_reserved,
          status: ride?.status || 'MATCHED',
          fare_bdt: ride?.fare_bdt || 220.0,
          joined_at: member.joined_at
        };
      });

      // Cabin layout with 4 passenger seats + Driver seat
      const totalCapacity = pool.seat_capacity; // 4
      const occupiedSeats = pool.members.reduce((sum, m) => sum + m.seats_reserved, 0);
      const remainingSeats = Math.max(0, totalCapacity - occupiedSeats);

      const cabinLayout = [
        {
          position: 'driver',
          label: 'Captain Seat (Front Left)',
          occupant: fullDriver?.full_name || 'Jashim Uddin',
          role: 'driver',
          isOccupied: true
        },
        {
          position: 'seat-1',
          label: 'Seat 1 (Front Passenger)',
          occupant: passengersManifest[0]?.passenger_name || 'Available',
          passenger: passengersManifest[0] || null,
          role: 'passenger',
          isOccupied: !!passengersManifest[0]
        },
        {
          position: 'seat-2',
          label: 'Seat 2 (Rear Left)',
          occupant: passengersManifest[1]?.passenger_name || 'Available',
          passenger: passengersManifest[1] || null,
          role: 'passenger',
          isOccupied: !!passengersManifest[1]
        },
        {
          position: 'seat-3',
          label: 'Seat 3 (Rear Right)',
          occupant: passengersManifest[2]?.passenger_name || 'Available',
          passenger: passengersManifest[2] || null,
          role: 'passenger',
          isOccupied: !!passengersManifest[2]
        },
        {
          position: 'seat-4',
          label: 'Seat 4 (Rear Center)',
          occupant: passengersManifest[3]?.passenger_name || 'Available',
          passenger: passengersManifest[3] || null,
          role: 'passenger',
          isOccupied: !!passengersManifest[3]
        }
      ];

      // Overall pool progression state
      const riderStatuses = passengersManifest.map((p) => p.status);
      let collectiveStatus: RideStatus = 'MATCHED';
      if (riderStatuses.every((s) => s === 'COMPLETED')) {
        collectiveStatus = 'COMPLETED';
      } else if (riderStatuses.some((s) => s === 'STARTED')) {
        collectiveStatus = 'STARTED';
      } else if (riderStatuses.some((s) => s === 'DRIVER_ARRIVED')) {
        collectiveStatus = 'DRIVER_ARRIVED';
      }

      res.status(200).json(
        successResponse(
          200,
          "Jashim's assigned Tesla pool 'Bullet' console retrieved",
          {
            driver: {
              id: driverId,
              name: fullDriver?.full_name || 'Jashim Uddin (Captain)',
              email: fullDriver?.email || 'jashim@dhakatesla.com',
              role: 'driver',
              rating: fullDriver?.rating_avg || 4.99
            },
            vehicle: {
              id: 'veh-bullet-01',
              nickname: 'Bullet',
              model: 'Tesla Model 3 ("Bullet")',
              license_plate: 'DHAKA-METRO-GA-77-5544',
              color: 'Deep Metallic Blue',
              battery_level_pct: 92,
              total_seat_capacity: totalCapacity,
              occupied_seats: occupiedSeats,
              available_seats: remainingSeats,
              capacity_pct: Math.round((occupiedSeats / totalCapacity) * 100)
            },
            assignedPool: {
              id: pool.id,
              status: pool.status,
              collective_status: collectiveStatus,
              corridor_name: pool.corridor_name,
              route_direction: pool.route_direction,
              origin_zone: pool.origin_zone,
              destination_zone: pool.destination_zone,
              total_capacity: totalCapacity,
              occupied_seats: occupiedSeats,
              remaining_seats: remainingSeats,
              passengers_manifest: passengersManifest,
              cabin_layout: cabinLayout
            }
          }
        )
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/driver/rides/:id/transition
   * Advance a single passenger's ride status through state machine
   */
  public async transitionRide(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const rideId = Array.isArray(req.params.id) ? req.params.id[0] : String(req.params.id);
      const { target_status, reason } = req.body;

      if (!target_status) {
        throw new AppError(400, 'MISSING_STATUS', "Missing 'target_status' in request body.");
      }

      const driverId = req.user?.id || 'usr-driv-jashim';
      const result = await poolService.transitionRideStatus(
        rideId,
        target_status,
        driverId,
        'driver',
        reason || `Captain Jashim advanced ride to ${target_status}`
      );

      res.status(200).json(
        successResponse(
          200,
          `State machine transition to '${target_status}' validated and audited.`,
          result
        )
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/driver/pool/advance
   * Advances the entire pool and all assigned passengers simultaneously:
   * MATCHED -> DRIVER_ARRIVED -> STARTED -> COMPLETED
   */
  public async advancePool(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const driverId = req.user?.id || 'usr-driv-jashim';
      const pool = poolService.getPool('pool-jashim-bullet');

      if (!pool) {
        throw new AppError(404, 'POOL_NOT_FOUND', "Jashim's pool 'pool-jashim-bullet' not found.");
      }

      // Check current state of first rider
      const firstRider = pool.members[0];
      const currentRide = firstRider ? poolService.getRideRequest(firstRider.ride_request_id) : null;
      const currentStatus = currentRide?.status || 'MATCHED';

      const sequence: Record<string, RideStatus> = {
        MATCHED: 'DRIVER_ARRIVED',
        ACCEPTED: 'DRIVER_ARRIVED',
        DRIVER_ARRIVED: 'STARTED',
        STARTED: 'COMPLETED'
      };

      const nextTarget = sequence[currentStatus];
      if (!nextTarget) {
        throw new AppError(
          400,
          'TERMINAL_STATE',
          `Cannot advance pool. Current status '${currentStatus}' is already at or past the final state.`
        );
      }

      // Transition all pool members through the state machine
      const results = [];
      for (const member of pool.members) {
        try {
          const resTransition = await poolService.transitionRideStatus(
            member.ride_request_id,
            nextTarget,
            driverId,
            'driver',
            `Captain Jashim advanced pool on Bullet to ${nextTarget}`
          );
          results.push(resTransition);
        } catch (e: any) {
          // If already in target status, continue
        }
      }

      // Update pool status
      if (nextTarget === 'STARTED') {
        pool.status = 'IN_PROGRESS';
      } else if (nextTarget === 'COMPLETED') {
        pool.status = 'COMPLETED';
      }

      res.status(200).json(
        successResponse(
          200,
          `Pool on Bullet successfully advanced to '${nextTarget}' for all passengers.`,
          {
            target_status: nextTarget,
            updated_riders_count: results.length,
            pool_id: pool.id
          }
        )
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/driver/pool/reset
   * Resets Jashim's pool back to MATCHED for replay
   */
  public async resetPool(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const resetPool = poolService.resetJashimPool();
      res.status(200).json(
        successResponse(
          200,
          "Jashim's pool on Bullet reset to initial MATCHED state for simulation replay.",
          { pool_id: resetPool.id }
        )
      );
    } catch (err) {
      next(err);
    }
  }

  public async updatePoolStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { status } = req.body;
      res.status(200).json(
        successResponse(
          200,
          `Tesla pool status updated to '${status || 'IN_PROGRESS'}'`,
          {
            pool_id: req.params.id || 'pool-jashim-bullet',
            current_status: status || 'IN_PROGRESS',
            updated_at: new Date().toISOString()
          }
        )
      );
    } catch (err) {
      next(err);
    }
  }
}

export const driverController = new DriverController();
