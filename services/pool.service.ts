import {
  RideRequest,
  Pool,
  PoolMember,
  DhakaZone,
  DHAKA_ZONES,
  RideStatus
} from '../models/ride.model';
import { RideStateMachine } from './stateMachine.service';
import { AppError } from '../models/response.model';

export interface CompatibilityResult {
  isCompatible: boolean;
  score: number; // 0 to 100 compatibility rating
  reasons: string[];
}

export class PoolService {
  // Thread-safe in-memory stores
  private pools: Map<string, Pool> = new Map();
  private rideRequests: Map<string, RideRequest> = new Map();

  // Row-level lock registry simulating PostgreSQL row-level locks (SELECT ... FOR UPDATE)
  private rowLocks: Map<string, Promise<void>> = new Map();

  constructor() {
    this.seedInitialState();
  }

  private seedInitialState() {
    // 1. Seed candidate Tesla pool: Southbound Morning Commute (Gulshan -> Motijheel)
    const poolAlpha: Pool = {
      id: 'pool-dhaka-tesla-alpha',
      driver_id: 'usr-driv-001',
      driver_name: 'Mahmudul Hasan (Tesla Captain)',
      vehicle_id: 'veh-001',
      vehicle_model: 'Tesla Model 3',
      license_plate: 'DHAKA-METRO-GA-11-9988',
      seat_capacity: 4,
      available_seats: 1, // 3 seats booked, 1 seat remaining
      status: 'FORMING',
      corridor_name: 'Gulshan 2 -> Banani -> Mohakhali -> Motijheel C/A',
      origin_zone: 'GULSHAN2',
      destination_zone: 'MOTIJHEEL',
      route_direction: 'SOUTHBOUND',
      members: [
        {
          id: 'mem-01',
          pool_id: 'pool-dhaka-tesla-alpha',
          ride_request_id: 'req-seed-01',
          passenger_id: 'usr-pass-001',
          passenger_name: 'Tanvir Hossain',
          seats_reserved: 1,
          pickup_zone: 'GULSHAN2',
          dropoff_zone: 'MOTIJHEEL',
          pickup_order: 1,
          dropoff_order: 3,
          member_status: 'BOOKED',
          joined_at: new Date(Date.now() - 25 * 60000).toISOString()
        },
        {
          id: 'mem-02',
          pool_id: 'pool-dhaka-tesla-alpha',
          ride_request_id: 'req-seed-02',
          passenger_id: 'usr-pass-002',
          passenger_name: 'Ayesha Siddiqua',
          seats_reserved: 1,
          pickup_zone: 'BANANI',
          dropoff_zone: 'KAWRANBAZAR',
          pickup_order: 2,
          dropoff_order: 1,
          member_status: 'BOOKED',
          joined_at: new Date(Date.now() - 15 * 60000).toISOString()
        },
        {
          id: 'mem-03',
          pool_id: 'pool-dhaka-tesla-alpha',
          ride_request_id: 'req-seed-03',
          passenger_id: 'usr-pass-003',
          passenger_name: 'Farhan Kabir',
          seats_reserved: 1,
          pickup_zone: 'MOHAKHALI',
          dropoff_zone: 'MOTIJHEEL',
          pickup_order: 3,
          dropoff_order: 2,
          member_status: 'BOOKED',
          joined_at: new Date(Date.now() - 5 * 60000).toISOString()
        }
      ],
      created_at: new Date(Date.now() - 30 * 60000).toISOString(),
      updated_at: new Date().toISOString()
    };

    // 2. Seed candidate Tesla pool: Northbound Evening Commute (Motijheel -> Uttara)
    const poolBeta: Pool = {
      id: 'pool-dhaka-tesla-beta',
      driver_id: 'usr-driv-002',
      driver_name: 'Kazi Nazmul',
      vehicle_id: 'veh-002',
      vehicle_model: 'Tesla Model Y',
      license_plate: 'DHAKA-METRO-GA-14-2233',
      seat_capacity: 4,
      available_seats: 4, // Empty pool
      status: 'FORMING',
      corridor_name: 'Motijheel -> Shahbagh -> Farmgate -> Uttara',
      origin_zone: 'MOTIJHEEL',
      destination_zone: 'UTTARA',
      route_direction: 'NORTHBOUND',
      members: [],
      created_at: new Date(Date.now() - 10 * 60000).toISOString(),
      updated_at: new Date().toISOString()
    };

    // 3. Seed Jashim's Assigned Tesla Pool: "Bullet" (3-seat capacity per PRD scenario)
    const poolJashim: Pool = {
      id: 'pool-jashim-bullet',
      driver_id: 'usr-driv-jashim',
      driver_name: 'Jashim Uddin (Captain)',
      vehicle_id: 'veh-bullet-01',
      vehicle_model: 'Tesla Model 3 ("Bullet")',
      license_plate: 'DHAKA-METRO-GA-77-5544',
      seat_capacity: 3, // PRD specification: 3-seat capacity on Bullet
      available_seats: 1, // 2 booked seats (Nusrat & Rafiq), 1 seat remaining
      status: 'MATCHED',
      corridor_name: 'Banani -> Mohakhali / Gulshan South Corridor',
      origin_zone: 'BANANI',
      destination_zone: 'MOHAKHALI',
      route_direction: 'SOUTHBOUND',
      members: [
        {
          id: 'mem-jashim-01',
          pool_id: 'pool-jashim-bullet',
          ride_request_id: 'req-jashim-01',
          passenger_id: 'usr-pass-nusrat',
          passenger_name: 'Nusrat Jahan',
          seats_reserved: 1,
          pickup_zone: 'BANANI',
          dropoff_zone: 'MOHAKHALI',
          pickup_order: 1,
          dropoff_order: 2,
          member_status: 'BOOKED',
          joined_at: new Date(Date.now() - 120 * 1000).toISOString()
        },
        {
          id: 'mem-jashim-02',
          pool_id: 'pool-jashim-bullet',
          ride_request_id: 'req-jashim-02',
          passenger_id: 'usr-pass-rafiq',
          passenger_name: 'Rafiqul Islam',
          seats_reserved: 1,
          pickup_zone: 'BANANI',
          dropoff_zone: 'GULSHAN1',
          pickup_order: 2,
          dropoff_order: 1,
          member_status: 'BOOKED',
          joined_at: new Date(Date.now() - 115 * 1000).toISOString()
        }
      ],
      created_at: new Date(Date.now() - 120 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    };

    this.pools.set(poolAlpha.id, poolAlpha);
    this.pools.set(poolBeta.id, poolBeta);
    this.pools.set(poolJashim.id, poolJashim);

    // Seed ride requests corresponding to PRD scenario
    const rideNusrat: RideRequest = {
      id: 'req-jashim-01',
      passenger_id: 'usr-pass-nusrat',
      passenger_name: 'Nusrat Jahan',
      pickup_zone: 'BANANI',
      pickup_lat: DHAKA_ZONES.BANANI.lat,
      pickup_lng: DHAKA_ZONES.BANANI.lng,
      dropoff_zone: 'MOHAKHALI',
      dropoff_lat: DHAKA_ZONES.MOHAKHALI.lat,
      dropoff_lng: DHAKA_ZONES.MOHAKHALI.lng,
      requested_seats: 1,
      status: 'MATCHED',
      fare_bdt: 224.0, // 20% pool discount
      pool_id: 'pool-jashim-bullet',
      created_at: new Date(Date.now() - 120 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    };

    const rideRafiq: RideRequest = {
      id: 'req-jashim-02',
      passenger_id: 'usr-pass-rafiq',
      passenger_name: 'Rafiqul Islam',
      pickup_zone: 'BANANI',
      pickup_lat: DHAKA_ZONES.BANANI.lat,
      pickup_lng: DHAKA_ZONES.BANANI.lng,
      dropoff_zone: 'GULSHAN1',
      dropoff_lat: DHAKA_ZONES.GULSHAN1.lat,
      dropoff_lng: DHAKA_ZONES.GULSHAN1.lng,
      requested_seats: 1,
      status: 'MATCHED',
      fare_bdt: 194.0, // 20% pool discount
      pool_id: 'pool-jashim-bullet',
      created_at: new Date(Date.now() - 115 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    };

    // Shirin arriving 30 seconds after Nusrat to compete for the last seat on Bullet
    const rideShirin: RideRequest = {
      id: 'req-jashim-shirin-03',
      passenger_id: 'usr-pass-shirin',
      passenger_name: 'Shirin Akter',
      pickup_zone: 'BANANI',
      pickup_lat: DHAKA_ZONES.BANANI.lat,
      pickup_lng: DHAKA_ZONES.BANANI.lng,
      dropoff_zone: 'MOHAKHALI',
      dropoff_lat: DHAKA_ZONES.MOHAKHALI.lat,
      dropoff_lng: DHAKA_ZONES.MOHAKHALI.lng,
      requested_seats: 1,
      status: 'REQUESTED', // Competing for last seat
      fare_bdt: 160.0,
      pool_id: undefined,  // Not yet allocated
      created_at: new Date(Date.now() - 90 * 1000).toISOString(), // Exactly 30s after Nusrat!
      updated_at: new Date(Date.now() - 90 * 1000).toISOString()
    };

    this.rideRequests.set(rideNusrat.id, rideNusrat);
    this.rideRequests.set(rideRafiq.id, rideRafiq);
    this.rideRequests.set(rideShirin.id, rideShirin);

    // Seed an initial pending ride request in Gulshan
    const sampleRequest: RideRequest = {
      id: 'req-dhaka-new-001',
      passenger_id: 'usr-pass-004',
      passenger_name: 'Dr. Shahreen Anam',
      pickup_zone: 'GULSHAN1',
      pickup_lat: DHAKA_ZONES.GULSHAN1.lat,
      pickup_lng: DHAKA_ZONES.GULSHAN1.lng,
      dropoff_zone: 'MOTIJHEEL',
      dropoff_lat: DHAKA_ZONES.MOTIJHEEL.lat,
      dropoff_lng: DHAKA_ZONES.MOTIJHEEL.lng,
      requested_seats: 1,
      status: 'REQUESTED',
      fare_bdt: 275.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.rideRequests.set(sampleRequest.id, sampleRequest);
  }

  /**
   * Acquire an exclusive row lock on a specific pool row (SELECT ... FOR UPDATE simulator).
   * Ensures that concurrent asynchronous requests serialize on the same pool row.
   */
  private async acquireRowLock(poolId: string): Promise<() => void> {
    let unlock: () => void = () => {};
    const lockPromise = new Promise<void>((resolve) => {
      unlock = resolve;
    });

    const previousLock = this.rowLocks.get(poolId) || Promise.resolve();
    this.rowLocks.set(
      poolId,
      previousLock.then(() => lockPromise)
    );

    await previousLock;
    return unlock;
  }

  /**
   * Evaluates corridor compatibility between a ride request and candidate pool.
   *
   * COMPATIBILITY SPECIFICATION:
   * 1. Status Check: Pool must be in 'FORMING' or 'MATCHED' (not departed).
   * 2. Capacity Check: Available seats >= requested seats, and pool members count + requested <= seat_capacity.
   * 3. Corridor Cluster: Pickup zone must share the same arterial direction (e.g. Southbound from North/Central to South).
   * 4. Overlapping Route Direction: Vector from pickup to dropoff must match pool route direction.
   */
  public evaluateCompatibility(request: RideRequest, pool: Pool): CompatibilityResult {
    const reasons: string[] = [];
    let score = 100;

    // Rule 1: Pool Status
    if (pool.status !== 'FORMING' && pool.status !== 'MATCHED') {
      return {
        isCompatible: false,
        score: 0,
        reasons: [`Pool status is '${pool.status}', not accepting new members`]
      };
    }

    // Rule 2: Strict Seat Capacity Check
    const totalMembersSeats = pool.members.reduce((sum, m) => sum + m.seats_reserved, 0);
    if (pool.available_seats < request.requested_seats) {
      return {
        isCompatible: false,
        score: 0,
        reasons: [
          `Insufficient available seats: requested ${request.requested_seats}, available ${pool.available_seats}`
        ]
      };
    }
    if (totalMembersSeats + request.requested_seats > pool.seat_capacity) {
      return {
        isCompatible: false,
        score: 0,
        reasons: [
          `Vehicle seat capacity exceeded: current ${totalMembersSeats} + requested ${request.requested_seats} > max ${pool.seat_capacity}`
        ]
      };
    }

    // Rule 3: Route Direction Alignment
    const pickupZone = DHAKA_ZONES[request.pickup_zone];
    const dropoffZone = DHAKA_ZONES[request.dropoff_zone];

    if (pickupZone && dropoffZone) {
      const isSouthbound = pickupZone.lat > dropoffZone.lat;
      const expectedDirection = isSouthbound ? 'SOUTHBOUND' : 'NORTHBOUND';

      if (pool.route_direction !== expectedDirection) {
        return {
          isCompatible: false,
          score: 10,
          reasons: [
            `Direction mismatch: request is ${expectedDirection} (${pickupZone.name} -> ${dropoffZone.name}), but pool is ${pool.route_direction}`
          ]
        };
      }
      reasons.push(`Direction alignment confirmed: both heading ${pool.route_direction}`);
    }

    // Rule 4: Zone Proximity to Pool Corridor
    const originZone = DHAKA_ZONES[pool.origin_zone];
    const destinationZone = DHAKA_ZONES[pool.destination_zone];

    if (pickupZone && originZone) {
      if (pickupZone.cluster === originZone.cluster || pickupZone.cluster === 'CENTRAL') {
        score += 20;
        reasons.push(
          `Pickup in corridor cluster: ${pickupZone.name} (${pickupZone.cluster}) aligns with pool origin (${originZone.name})`
        );
      } else {
        score -= 30;
        reasons.push(`Pickup cluster ${pickupZone.cluster} requires slight corridor deviation`);
      }
    }

    if (dropoffZone && destinationZone) {
      if (dropoffZone.cluster === destinationZone.cluster) {
        score += 20;
        reasons.push(
          `Dropoff terminal match: ${dropoffZone.name} reaches pool destination ${destinationZone.name}`
        );
      }
    }

    return {
      isCompatible: score >= 50,
      score: Math.min(100, Math.max(0, score)),
      reasons
    };
  }

  /**
   * Matching Function: Given a new RideRequest, find the best compatible pool.
   */
  public findBestCompatiblePool(request: RideRequest): {
    pool: Pool | null;
    evaluation: CompatibilityResult | null;
  } {
    let bestPool: Pool | null = null;
    let highestScore = -1;
    let bestEvaluation: CompatibilityResult | null = null;

    for (const pool of this.pools.values()) {
      const evalResult = this.evaluateCompatibility(request, pool);
      if (evalResult.isCompatible && evalResult.score > highestScore) {
        highestScore = evalResult.score;
        bestPool = pool;
        bestEvaluation = evalResult;
      }
    }

    return { pool: bestPool, evaluation: bestEvaluation };
  }

  /**
   * ACID Database Transaction with Row-Level Locking (SELECT ... FOR UPDATE)
   *
   * SQL Implementation Equivalent:
   * BEGIN;
   *   SELECT * FROM pools WHERE id = $1 FOR UPDATE;
   *   SELECT * FROM vehicles WHERE id = $2 FOR SHARE;
   *   -- Validate seat capacity under exclusive lock
   *   INSERT INTO pool_members (...) VALUES (...);
   *   UPDATE pools SET available_seats = available_seats - $requested WHERE id = $1;
   *   UPDATE ride_requests SET status = 'MATCHED', pool_id = $1 WHERE id = $3;
   * COMMIT;
   */
  public async allocateSeatWithRowLock(
    rideRequestId: string,
    targetPoolId: string,
    actorId: string,
    actorRole: string
  ): Promise<{
    success: boolean;
    pool: Pool;
    rideRequest: RideRequest;
    newMember: PoolMember;
    auditLog: any;
    lockLatencyMs: number;
  }> {
    const lockStart = performance.now();

    // 1. Acquire exclusive row lock on target pool (simulating SELECT ... FOR UPDATE)
    const releaseLock = await this.acquireRowLock(targetPoolId);

    try {
      const lockAcquiredTime = performance.now();
      const lockLatencyMs = Math.round(lockAcquiredTime - lockStart);

      // 2. Fetch locked pool state
      const pool = this.pools.get(targetPoolId);
      if (!pool) {
        throw new AppError(404, 'POOL_NOT_FOUND', `Pool with ID '${targetPoolId}' does not exist.`);
      }

      // 3. Fetch ride request
      const rideRequest = this.rideRequests.get(rideRequestId);
      if (!rideRequest) {
        throw new AppError(
          404,
          'RIDE_REQUEST_NOT_FOUND',
          `Ride request with ID '${rideRequestId}' does not exist.`
        );
      }

      // 4. Validate ride request state machine: must transition from REQUESTED -> MATCHED
      RideStateMachine.validateTransition(rideRequest.status, 'MATCHED');

      // 5. STRICT CAPACITY CHECK (Under Exclusive Lock):
      const currentReservedSeats = pool.members.reduce(
        (sum, member) => sum + member.seats_reserved,
        0
      );

      if (pool.available_seats < rideRequest.requested_seats) {
        throw new AppError(
          409,
          'SEAT_CAPACITY_EXCEEDED',
          `Concurrent conflict: Target pool has ${pool.available_seats} seat(s) available, but request requires ${rideRequest.requested_seats}. Locked transaction rejected to preserve 4-seat capacity constraint.`,
          {
            pool_id: pool.id,
            vehicle_capacity: pool.seat_capacity,
            current_reserved: currentReservedSeats,
            available_seats: pool.available_seats,
            requested_seats: rideRequest.requested_seats
          }
        );
      }

      if (currentReservedSeats + rideRequest.requested_seats > pool.seat_capacity) {
        throw new AppError(
          409,
          'SEAT_CAPACITY_EXCEEDED',
          `Hard vehicle limit violated: ${currentReservedSeats} booked + ${rideRequest.requested_seats} requested > max capacity of ${pool.seat_capacity}.`,
          {
            pool_id: pool.id,
            vehicle_capacity: pool.seat_capacity,
            current_reserved: currentReservedSeats
          }
        );
      }

      // 6. Create pool member entry
      const newMember: PoolMember = {
        id: `mem-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
        pool_id: pool.id,
        ride_request_id: rideRequest.id,
        passenger_id: rideRequest.passenger_id,
        passenger_name: rideRequest.passenger_name,
        seats_reserved: rideRequest.requested_seats,
        pickup_zone: rideRequest.pickup_zone,
        dropoff_zone: rideRequest.dropoff_zone,
        pickup_order: pool.members.length + 1,
        dropoff_order: pool.members.length + 1,
        member_status: 'BOOKED',
        joined_at: new Date().toISOString()
      };

      // 7. Atomic updates: Add member & decrement available seats
      pool.members.push(newMember);
      pool.available_seats -= rideRequest.requested_seats;
      pool.updated_at = new Date().toISOString();

      if (pool.available_seats === 0) {
        pool.status = 'MATCHED'; // Pool is fully packed!
      }

      // 8. Update ride request status using State Machine
      const oldStatus = rideRequest.status;
      rideRequest.status = 'MATCHED';
      rideRequest.pool_id = pool.id;
      rideRequest.updated_at = new Date().toISOString();

      // 9. Record transition in audit table
      const auditLog = RideStateMachine.recordTransition(
        rideRequest.id,
        oldStatus,
        'MATCHED',
        actorId,
        actorRole,
        `Matched and locked into pool '${pool.id}' (Remaining seats: ${pool.available_seats})`
      );

      return {
        success: true,
        pool: { ...pool },
        rideRequest: { ...rideRequest },
        newMember,
        auditLog,
        lockLatencyMs
      };
    } finally {
      // Release exclusive row lock
      releaseLock();
    }
  }

  /**
   * Transition Ride Request State Machine directly (e.g. MATCHED -> DRIVER_ARRIVED -> STARTED -> COMPLETED)
   */
  public async transitionRideStatus(
    rideRequestId: string,
    targetStatus: RideStatus,
    actorId: string,
    actorRole: string,
    reason?: string
  ): Promise<{
    rideRequest: RideRequest;
    auditLog: any;
  }> {
    const request = this.rideRequests.get(rideRequestId);
    if (!request) {
      throw new AppError(
        404,
        'RIDE_REQUEST_NOT_FOUND',
        `Ride request '${rideRequestId}' not found.`
      );
    }

    const oldStatus = request.status;

    // Validate transition via state machine
    RideStateMachine.validateTransition(oldStatus, targetStatus);

    // Audit and update
    const auditLog = RideStateMachine.recordTransition(
      request.id,
      oldStatus,
      targetStatus,
      actorId,
      actorRole,
      reason
    );

    request.status = targetStatus;
    request.updated_at = new Date().toISOString();

    // If cancelled, free up pool seats if assigned
    if (targetStatus === 'CANCELLED' && request.pool_id) {
      const pool = this.pools.get(request.pool_id);
      if (pool) {
        const member = pool.members.find((m) => m.ride_request_id === request.id);
        if (member && member.member_status !== 'CANCELLED') {
          member.member_status = 'CANCELLED';
          pool.available_seats += member.seats_reserved;
          pool.updated_at = new Date().toISOString();
        }
      }
    }

    return { rideRequest: { ...request }, auditLog };
  }

  // Helpers
  public createRideRequest(data: {
    passenger_id: string;
    passenger_name: string;
    pickup_zone: string;
    dropoff_zone: string;
    requested_seats: number;
  }): RideRequest {
    const pickupZone = DHAKA_ZONES[data.pickup_zone] || DHAKA_ZONES.GULSHAN2;
    const dropoffZone = DHAKA_ZONES[data.dropoff_zone] || DHAKA_ZONES.MOTIJHEEL;

    const newRequest: RideRequest = {
      id: `req-user-${Date.now().toString(36)}`,
      passenger_id: data.passenger_id,
      passenger_name: data.passenger_name,
      pickup_zone: data.pickup_zone,
      pickup_lat: pickupZone.lat,
      pickup_lng: pickupZone.lng,
      dropoff_zone: data.dropoff_zone,
      dropoff_lat: dropoffZone.lat,
      dropoff_lng: dropoffZone.lng,
      requested_seats: data.requested_seats || 1,
      status: 'REQUESTED',
      fare_bdt: 295.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.rideRequests.set(newRequest.id, newRequest);
    return newRequest;
  }

  public getPool(id: string): Pool | null {
    return this.pools.get(id) || null;
  }

  public getPoolByDriverId(driverId: string): Pool | null {
    for (const pool of this.pools.values()) {
      if (pool.driver_id === driverId) {
        return pool;
      }
    }
    return null;
  }

  public resetJashimPool(): Pool {
    // Reset pool state to MATCHED
    const jashimPool = this.pools.get('pool-jashim-bullet');
    if (jashimPool) {
      jashimPool.status = 'MATCHED';
      jashimPool.available_seats = 1;
      jashimPool.members.forEach((m) => {
        m.member_status = 'BOOKED';
      });
      jashimPool.updated_at = new Date().toISOString();
    }

    // Reset rider statuses
    const rides = ['req-jashim-01', 'req-jashim-02', 'req-jashim-03'];
    rides.forEach((rId) => {
      const r = this.rideRequests.get(rId);
      if (r) {
        r.status = 'MATCHED';
        r.updated_at = new Date().toISOString();
      }
    });

    return jashimPool || (this.pools.get('pool-jashim-bullet') as Pool);
  }

  public getAllPools(): Pool[] {
    return Array.from(this.pools.values());
  }

  public getRideRequest(id: string): RideRequest | null {
    return this.rideRequests.get(id) || null;
  }

  public getAllRideRequests(): RideRequest[] {
    return Array.from(this.rideRequests.values());
  }

  public seedPool(pool: Pool): void {
    this.pools.set(pool.id, pool);
  }

  public seedRideRequest(request: RideRequest): void {
    this.rideRequests.set(request.id, request);
  }
}

export const poolService = new PoolService();
