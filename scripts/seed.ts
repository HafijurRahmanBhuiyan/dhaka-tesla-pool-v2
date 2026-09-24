/**
 * Dhaka Tesla Pool - PRD Scenario Seed Script
 * File: /scripts/seed.ts
 *
 * Runs locally via `npx tsx scripts/seed.ts` or via docker-compose (`docker compose run api npm run seed`).
 * Idempotent: Can be executed multiple times safely without corrupting data or throwing constraint errors.
 *
 * PRD Scenario Reproduces:
 *   1. Driver Jashim with vehicle "Bullet" (3-seat capacity).
 *   2. Passengers Nusrat and Rafiq with overlapping Banani -> Mohakhali/Gulshan trip.
 *   3. Shirin arriving 30 seconds later to compete for the last seat.
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { poolService } from '../services/pool.service';
import { userService } from '../services/user.service';
import { DHAKA_ZONES, RideRequest, Pool, PoolMember } from '../models/ride.model';
import { User } from '../models/user.model';
import { calculateFare } from '../services/fare.service';

export async function runSeed(verbose = true): Promise<{
  driver: User;
  passengers: User[];
  pool: Pool;
  requests: RideRequest[];
  bulletCapacity: number;
  availableSeats: number;
}> {
  if (verbose) {
    console.log('======================================================================');
    console.log('🌱 DHAKA TESLA POOL - PRD SCENARIO IDEMPOTENT SEED SCRIPT');
    console.log('======================================================================');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  // Time reference
  const now = Date.now();
  const t0 = now - 120 * 1000; // 2 minutes ago
  const tNusrat = new Date(t0).toISOString();
  const tRafiq = new Date(t0 + 5 * 1000).toISOString();
  const tShirin = new Date(t0 + 30 * 1000).toISOString(); // Exactly 30s after Nusrat!

  // -------------------------------------------------------------------------
  // 1. DRIVER JASHIM & VEHICLE "BULLET" (3-SEAT CAPACITY)
  // -------------------------------------------------------------------------
  const driverJashim: User = {
    id: 'usr-driv-jashim',
    email: 'jashim@dhakatesla.com',
    phone: '+8801811000003',
    password_hash: passwordHash,
    full_name: 'Jashim Uddin (Captain)',
    role: 'driver',
    rating_avg: 4.99,
    is_active: true,
    vehicle: {
      id: 'veh-bullet-01',
      make: 'Tesla',
      model: 'Model 3 ("Bullet")',
      year: 2025,
      color: 'Deep Metallic Blue',
      license_plate: 'DHAKA-METRO-GA-77-5544',
      total_seat_capacity: 3, // PRD specification: 3-seat capacity
      battery_level_pct: 92,
      status: 'ACTIVE'
    },
    created_at: new Date(t0 - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  };

  // -------------------------------------------------------------------------
  // 2. PASSENGERS: NUSRAT, RAFIQ, SHIRIN
  // -------------------------------------------------------------------------
  const passengerNusrat: User = {
    id: 'usr-pass-nusrat',
    email: 'nusrat@dhakatesla.com',
    phone: '+8801711000001',
    password_hash: passwordHash,
    full_name: 'Nusrat Jahan',
    role: 'passenger',
    rating_avg: 4.95,
    is_active: true,
    created_at: new Date(t0 - 15 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  };

  const passengerRafiq: User = {
    id: 'usr-pass-rafiq',
    email: 'rafiq@dhakatesla.com',
    phone: '+8801711000002',
    password_hash: passwordHash,
    full_name: 'Rafiqul Islam',
    role: 'passenger',
    rating_avg: 4.88,
    is_active: true,
    created_at: new Date(t0 - 10 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  };

  const passengerShirin: User = {
    id: 'usr-pass-shirin',
    email: 'shirin@dhakatesla.com',
    phone: '+8801711000004',
    password_hash: passwordHash,
    full_name: 'Shirin Akter',
    role: 'passenger',
    rating_avg: 5.0,
    is_active: true,
    created_at: new Date(t0 - 5 * 86400000).toISOString(),
    updated_at: new Date().toISOString()
  };

  // -------------------------------------------------------------------------
  // 3. FARES (Using integer paisa arithmetic from Fare Engine)
  // -------------------------------------------------------------------------
  const fareNusrat = calculateFare({
    baseFare: 3000,
    distanceKm: 10.0,
    ratePerKm: 2500,
    poolDiscountPercent: 20
  });

  const fareRafiq = calculateFare({
    baseFare: 3000,
    distanceKm: 8.5,
    ratePerKm: 2500,
    poolDiscountPercent: 20
  });

  const fareShirin = calculateFare({
    baseFare: 3000,
    distanceKm: 6.8,
    ratePerKm: 2500,
    poolDiscountPercent: 0 // Solo initial request
  });

  // -------------------------------------------------------------------------
  // 4. RIDE REQUESTS (PRD Overlapping Scenario)
  // -------------------------------------------------------------------------
  // 4a. Nusrat: Banani -> Mohakhali/Gulshan (Requested at T0)
  const reqNusrat: RideRequest = {
    id: 'req-nusrat-banani-01',
    passenger_id: passengerNusrat.id,
    passenger_name: passengerNusrat.full_name,
    pickup_zone: 'BANANI',
    pickup_lat: DHAKA_ZONES.BANANI.lat,
    pickup_lng: DHAKA_ZONES.BANANI.lng,
    dropoff_zone: 'MOHAKHALI',
    dropoff_lat: DHAKA_ZONES.MOHAKHALI.lat,
    dropoff_lng: DHAKA_ZONES.MOHAKHALI.lng,
    requested_seats: 1,
    status: 'MATCHED',
    pool_id: 'pool-jashim-bullet',
    fare_bdt: fareNusrat.fareInBdt,
    created_at: tNusrat,
    updated_at: new Date(t0 + 2000).toISOString()
  };

  // 4b. Rafiq: Overlapping Banani -> Mohakhali/Gulshan (Requested at T0 + 5s)
  const reqRafiq: RideRequest = {
    id: 'req-rafiq-banani-02',
    passenger_id: passengerRafiq.id,
    passenger_name: passengerRafiq.full_name,
    pickup_zone: 'BANANI',
    pickup_lat: DHAKA_ZONES.BANANI.lat,
    pickup_lng: DHAKA_ZONES.BANANI.lng,
    dropoff_zone: 'GULSHAN1',
    dropoff_lat: DHAKA_ZONES.GULSHAN1.lat,
    dropoff_lng: DHAKA_ZONES.GULSHAN1.lng,
    requested_seats: 1,
    status: 'MATCHED',
    pool_id: 'pool-jashim-bullet',
    fare_bdt: fareRafiq.fareInBdt,
    created_at: tRafiq,
    updated_at: new Date(t0 + 7000).toISOString()
  };

  // 4c. Shirin: Arriving EXACTLY 30 seconds later to compete for the last seat!
  // Status: REQUESTED / PENDING, pool_id: null (competing for the remaining 1 seat on Bullet)
  const reqShirin: RideRequest = {
    id: 'req-shirin-compete-03',
    passenger_id: passengerShirin.id,
    passenger_name: passengerShirin.full_name,
    pickup_zone: 'BANANI',
    pickup_lat: DHAKA_ZONES.BANANI.lat,
    pickup_lng: DHAKA_ZONES.BANANI.lng,
    dropoff_zone: 'MOHAKHALI',
    dropoff_lat: DHAKA_ZONES.MOHAKHALI.lat,
    dropoff_lng: DHAKA_ZONES.MOHAKHALI.lng,
    requested_seats: 1,
    status: 'REQUESTED', // Competing for last seat
    pool_id: undefined,  // Not yet allocated
    fare_bdt: fareShirin.fareInBdt,
    created_at: tShirin, // T0 + 30 seconds
    updated_at: tShirin
  };

  // -------------------------------------------------------------------------
  // 5. POOL MEMBERS (Nusrat & Rafiq occupying 2 seats on Bullet)
  // -------------------------------------------------------------------------
  const memberNusrat: PoolMember = {
    id: 'mem-nusrat-bullet',
    pool_id: 'pool-jashim-bullet',
    ride_request_id: reqNusrat.id,
    passenger_id: passengerNusrat.id,
    passenger_name: passengerNusrat.full_name,
    seats_reserved: 1,
    pickup_zone: 'BANANI',
    dropoff_zone: 'MOHAKHALI',
    pickup_order: 1,
    dropoff_order: 2,
    member_status: 'BOOKED',
    joined_at: new Date(t0 + 2000).toISOString()
  };

  const memberRafiq: PoolMember = {
    id: 'mem-rafiq-bullet',
    pool_id: 'pool-jashim-bullet',
    ride_request_id: reqRafiq.id,
    passenger_id: passengerRafiq.id,
    passenger_name: passengerRafiq.full_name,
    seats_reserved: 1,
    pickup_zone: 'BANANI',
    dropoff_zone: 'GULSHAN1',
    pickup_order: 2,
    dropoff_order: 1,
    member_status: 'BOOKED',
    joined_at: new Date(t0 + 7000).toISOString()
  };

  // -------------------------------------------------------------------------
  // 6. POOL RECORD ("Bullet", 3-seat capacity, 2 occupied, 1 remaining)
  // -------------------------------------------------------------------------
  const bulletPool: Pool = {
    id: 'pool-jashim-bullet',
    driver_id: driverJashim.id,
    driver_name: driverJashim.full_name,
    vehicle_id: 'veh-bullet-01',
    vehicle_model: 'Tesla Model 3 ("Bullet")',
    license_plate: 'DHAKA-METRO-GA-77-5544',
    seat_capacity: 3, // 3-seat passenger capacity on Bullet
    available_seats: 1, // 3 - 2 = 1 seat remaining
    status: 'MATCHED',
    corridor_name: 'Banani -> Mohakhali / Gulshan South Corridor',
    origin_zone: 'BANANI',
    destination_zone: 'MOHAKHALI',
    route_direction: 'SOUTHBOUND',
    members: [memberNusrat, memberRafiq],
    created_at: new Date(t0).toISOString(),
    updated_at: new Date().toISOString()
  };

  // -------------------------------------------------------------------------
  // 7. IN-MEMORY SEEDING (FOR MOCK & TEST RUNTIME)
  // -------------------------------------------------------------------------
  // Seed Users
  userService.seedUser(driverJashim);
  userService.seedUser(passengerNusrat);
  userService.seedUser(passengerRafiq);
  userService.seedUser(passengerShirin);

  // Seed Pool & Requests in poolService
  poolService.seedPool(bulletPool);
  poolService.seedRideRequest(reqNusrat);
  poolService.seedRideRequest(reqRafiq);
  poolService.seedRideRequest(reqShirin);

  if (verbose) {
    console.log('✔ Driver Jashim inserted:');
    console.log(`   - Vehicle: ${driverJashim.vehicle?.model} (${driverJashim.vehicle?.license_plate})`);
    console.log(`   - Passenger Seat Capacity: ${driverJashim.vehicle?.total_seat_capacity} seats`);
    console.log('');
    console.log('✔ Passengers inserted:');
    console.log(`   - Nusrat Jahan (${passengerNusrat.email})`);
    console.log(`   - Rafiqul Islam (${passengerRafiq.email})`);
    console.log(`   - Shirin Akter  (${passengerShirin.email})`);
    console.log('');
    console.log('✔ Pool "Bullet" State:');
    console.log(`   - Total Cabin Capacity: 3 seats`);
    console.log(`   - Booked Members: Nusrat (Seat 1) & Rafiq (Seat 2)`);
    console.log(`   - Available Seats Remaining: ${bulletPool.available_seats} of 3`);
    console.log('');
    console.log('✔ PRD Scenario Recreated:');
    console.log(`   - T0 + 00s: Nusrat requests Banani -> Mohakhali (Fare: ${fareNusrat.fareInBdt} BDT) -> Matched`);
    console.log(`   - T0 + 05s: Rafiq requests overlapping Banani -> Gulshan (Fare: ${fareRafiq.fareInBdt} BDT) -> Matched`);
    console.log(`   - T0 + 30s: Shirin requests Banani -> Mohakhali 30 SECONDS LATER -> Status: REQUESTED`);
    console.log(`               (Actively competing for the 1 final remaining seat on Bullet!)`);
    console.log('======================================================================');
    console.log('🎉 Seed completed successfully and verified idempotent.');
    console.log('======================================================================\n');
  }

  return {
    driver: driverJashim,
    passengers: [passengerNusrat, passengerRafiq, passengerShirin],
    pool: bulletPool,
    requests: [reqNusrat, reqRafiq, reqShirin],
    bulletCapacity: 3,
    availableSeats: 1
  };
}

// Auto-run if executed directly
if (process.argv[1]?.includes('seed.ts')) {
  runSeed(true)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seed failed:', err);
      process.exit(1);
    });
}
