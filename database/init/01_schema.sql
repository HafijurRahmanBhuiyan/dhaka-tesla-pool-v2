-- =========================================================================
-- DHAKA TESLA POOL MVP - POSTGRESQL 16 SCHEMA
-- File: /database/init/01_schema.sql
-- Idempotent initialization: Safe to re-run
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table (Passengers, Drivers, Admins)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(32) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('passenger', 'driver', 'admin')),
    rating_avg NUMERIC(3,2) NOT NULL DEFAULT 5.00 CHECK (rating_avg BETWEEN 1.00 AND 5.00),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Vehicles Table (Tesla Fleet)
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    make VARCHAR(50) NOT NULL DEFAULT 'Tesla',
    model VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    color VARCHAR(30) NOT NULL,
    license_plate VARCHAR(50) NOT NULL UNIQUE,
    total_seat_capacity INT NOT NULL DEFAULT 3 CHECK (total_seat_capacity BETWEEN 1 AND 7),
    battery_level_pct INT CHECK (battery_level_pct BETWEEN 0 AND 100),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);

-- 3. Pools Table (Shared Journeys in a Tesla)
CREATE TABLE IF NOT EXISTS pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    max_seats INT NOT NULL CHECK (max_seats BETWEEN 1 AND 7),
    available_seats INT NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'FORMING' 
        CHECK (status IN ('FORMING', 'MATCHED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    corridor_name VARCHAR(255),
    route_polyline TEXT,
    total_distance_km NUMERIC(6,2),
    total_pool_fare_bdt NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_pool_seats CHECK (available_seats >= 0 AND available_seats <= max_seats)
);

CREATE INDEX IF NOT EXISTS idx_pools_driver_status ON pools(driver_id, status);

-- 4. Ride Requests Table (Passenger Trip Demands)
CREATE TABLE IF NOT EXISTS ride_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passenger_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    pickup_address VARCHAR(255) NOT NULL,
    pickup_lat NUMERIC(10,7) NOT NULL,
    pickup_lng NUMERIC(10,7) NOT NULL,
    dropoff_address VARCHAR(255) NOT NULL,
    dropoff_lat NUMERIC(10,7) NOT NULL,
    dropoff_lng NUMERIC(10,7) NOT NULL,
    requested_seats INT NOT NULL DEFAULT 1 CHECK (requested_seats BETWEEN 1 AND 4),
    status VARCHAR(25) NOT NULL DEFAULT 'REQUESTED' 
        CHECK (status IN ('PENDING', 'REQUESTED', 'MATCHED', 'ACCEPTED', 'DRIVER_ARRIVED', 'STARTED', 'PICKED_UP', 'COMPLETED', 'CANCELLED')),
    pool_id UUID REFERENCES pools(id) ON DELETE SET NULL,
    estimated_distance_km NUMERIC(6,2) NOT NULL,
    fare_bdt NUMERIC(10,2),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON ride_requests(status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_pool_id ON ride_requests(pool_id);

-- 5. Pool Members Table (Allocation of Requests into Candidate Pools)
CREATE TABLE IF NOT EXISTS pool_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
    ride_request_id UUID NOT NULL UNIQUE REFERENCES ride_requests(id) ON DELETE RESTRICT,
    passenger_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    seats_reserved INT NOT NULL CHECK (seats_reserved BETWEEN 1 AND 4),
    pickup_order INT NOT NULL DEFAULT 1,
    dropoff_order INT NOT NULL DEFAULT 1,
    member_status VARCHAR(25) NOT NULL DEFAULT 'BOOKED' 
        CHECK (member_status IN ('BOOKED', 'BOARDED', 'DROPPED_OFF', 'CANCELLED')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pool_members_pool ON pool_members(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_members_passenger ON pool_members(passenger_id);

-- 6. Ride Status History Table (Immutable Audit Ledger)
CREATE TABLE IF NOT EXISTS ride_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_request_id UUID REFERENCES ride_requests(id) ON DELETE CASCADE,
    pool_id UUID REFERENCES pools(id) ON DELETE CASCADE,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reason_or_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_request ON ride_status_history(ride_request_id);

-- 7. Fares Table (Paisa & BDT Financial Calculations)
CREATE TABLE IF NOT EXISTS fares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_request_id UUID NOT NULL UNIQUE REFERENCES ride_requests(id) ON DELETE RESTRICT,
    pool_id UUID REFERENCES pools(id) ON DELETE RESTRICT,
    base_fare NUMERIC(10,2) NOT NULL DEFAULT 30.00,
    distance_km NUMERIC(6,2) NOT NULL,
    per_km_rate NUMERIC(6,2) NOT NULL DEFAULT 25.00,
    pool_discount_pct NUMERIC(4,2) NOT NULL DEFAULT 20.00 CHECK (pool_discount_pct BETWEEN 0.00 AND 60.00),
    final_fare NUMERIC(10,2) NOT NULL CHECK (final_fare >= 0.00),
    currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fares_pool_id ON fares(pool_id);
