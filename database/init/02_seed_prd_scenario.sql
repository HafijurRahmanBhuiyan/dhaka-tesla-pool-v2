-- =========================================================================
-- DHAKA TESLA POOL MVP - PRD SCENARIO SEED SCRIPT
-- File: /database/init/02_seed_prd_scenario.sql
-- 
-- PRD Scenario:
--   1. Driver Jashim with Tesla Model 3 "Bullet" (3-seat passenger capacity).
--   2. Passengers Nusrat and Rafiq with overlapping Banani -> Mohakhali/Gulshan trip,
--      both matched to Bullet, taking 2 seats and leaving exactly 1 seat available.
--   3. Passenger Shirin arriving 30 seconds later with status 'REQUESTED' (or 'PENDING'),
--      actively competing for that 1 final remaining seat.
-- 
-- Idempotency: Uses fixed deterministic UUIDs and ON CONFLICT DO UPDATE/NOTHING.
-- Safe to re-run multiple times without duplicate key errors or dirty state.
-- =========================================================================

-- Deterministic Timestamp Base (T0 = 2 minutes ago)
DO $$
DECLARE
    t0 TIMESTAMPTZ := NOW() - INTERVAL '120 seconds';
    t_nusrat TIMESTAMPTZ := t0;
    t_rafiq TIMESTAMPTZ := t0 + INTERVAL '5 seconds';
    t_shirin TIMESTAMPTZ := t0 + INTERVAL '30 seconds'; -- Exactly 30s after Nusrat!

    v_jashim_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    v_nusrat_id UUID := 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22';
    v_rafiq_id  UUID := 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c33';
    v_shirin_id UUID := 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d44';

    v_vehicle_bullet_id UUID := 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e55';
    v_pool_bullet_id    UUID := 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f66';

    v_req_nusrat_id UUID := '11111111-9c0b-4ef8-bb6d-6bb9bd380111';
    v_req_rafiq_id  UUID := '22222222-9c0b-4ef8-bb6d-6bb9bd380222';
    v_req_shirin_id UUID := '33333333-9c0b-4ef8-bb6d-6bb9bd380333';

    v_mem_nusrat_id UUID := 'aaaa0001-9c0b-4ef8-bb6d-6bb9bd380001';
    v_mem_rafiq_id  UUID := 'aaaa0002-9c0b-4ef8-bb6d-6bb9bd380002';

    v_fare_nusrat_id UUID := 'faaa0001-9c0b-4ef8-bb6d-6bb9bd380001';
    v_fare_rafiq_id  UUID := 'faaa0002-9c0b-4ef8-bb6d-6bb9bd380002';
    v_fare_shirin_id UUID := 'faaa0003-9c0b-4ef8-bb6d-6bb9bd380003';

    v_default_password_hash VARCHAR := '$2a$10$wN9H0Z2kYh7.O8GjF5.v2eqs1f4yUvE4/8b3Cg6yK2U9o0J6Xv8Ky'; -- 'Password123!'
BEGIN
    -- ---------------------------------------------------------------------
    -- 1. INSERT DRIVER & PASSENGER USERS (Idempotent)
    -- ---------------------------------------------------------------------
    -- Driver Jashim
    INSERT INTO users (id, email, phone, password_hash, full_name, role, rating_avg, is_active, created_at, updated_at)
    VALUES (
        v_jashim_id,
        'jashim@dhakatesla.com',
        '+8801811000003',
        v_default_password_hash,
        'Jashim Uddin (Captain)',
        'driver',
        4.99,
        TRUE,
        t0 - INTERVAL '30 days',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        rating_avg = EXCLUDED.rating_avg;

    -- Passenger 1: Nusrat
    INSERT INTO users (id, email, phone, password_hash, full_name, role, rating_avg, is_active, created_at, updated_at)
    VALUES (
        v_nusrat_id,
        'nusrat@dhakatesla.com',
        '+8801711000001',
        v_default_password_hash,
        'Nusrat Jahan',
        'passenger',
        4.95,
        TRUE,
        t0 - INTERVAL '15 days',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;

    -- Passenger 2: Rafiq
    INSERT INTO users (id, email, phone, password_hash, full_name, role, rating_avg, is_active, created_at, updated_at)
    VALUES (
        v_rafiq_id,
        'rafiq@dhakatesla.com',
        '+8801711000002',
        v_default_password_hash,
        'Rafiqul Islam',
        'passenger',
        4.88,
        TRUE,
        t0 - INTERVAL '10 days',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;

    -- Passenger 3: Shirin (Arriving 30s later to compete for last seat)
    INSERT INTO users (id, email, phone, password_hash, full_name, role, rating_avg, is_active, created_at, updated_at)
    VALUES (
        v_shirin_id,
        'shirin@dhakatesla.com',
        '+8801711000004',
        v_default_password_hash,
        'Shirin Akter',
        'passenger',
        5.00,
        TRUE,
        t0 - INTERVAL '5 days',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;

    -- ---------------------------------------------------------------------
    -- 2. INSERT VEHICLE "BULLET" (3-seat physical passenger capacity)
    -- ---------------------------------------------------------------------
    INSERT INTO vehicles (id, driver_id, make, model, year, color, license_plate, total_seat_capacity, battery_level_pct, status, created_at, updated_at)
    VALUES (
        v_vehicle_bullet_id,
        v_jashim_id,
        'Tesla',
        'Model 3 ("Bullet")',
        2025,
        'Deep Metallic Blue',
        'DHAKA-METRO-GA-77-5544',
        3, -- PRD specification: 3-seat capacity
        92,
        'ACTIVE',
        t0 - INTERVAL '20 days',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        driver_id = EXCLUDED.driver_id,
        model = EXCLUDED.model,
        total_seat_capacity = 3,
        status = 'ACTIVE';

    -- ---------------------------------------------------------------------
    -- 3. INSERT JASHIM'S ASSIGNED POOL ON "BULLET"
    --    Capacity: 3 seats, Occupied: 2 (Nusrat & Rafiq), Remaining: 1 seat
    -- ---------------------------------------------------------------------
    INSERT INTO pools (
        id, driver_id, vehicle_id, max_seats, available_seats, status,
        corridor_name, route_polyline, total_distance_km, total_pool_fare_bdt,
        started_at, completed_at, created_at, updated_at
    )
    VALUES (
        v_pool_bullet_id,
        v_jashim_id,
        v_vehicle_bullet_id,
        3, -- max_seats = 3
        1, -- available_seats = 1 (2 taken by Nusrat & Rafiq, 1 remaining)
        'MATCHED',
        'Banani -> Mohakhali / Gulshan South Corridor',
        'BANANI_RD11 -> KEMAL_ATATURK -> MOHAKHALI_FLYOVER -> GULSHAN1_LINK',
        11.50,
        418.00, -- Nusrat (224 BDT) + Rafiq (194 BDT)
        NULL,
        NULL,
        t0,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        max_seats = 3,
        available_seats = 1,
        status = 'MATCHED',
        total_pool_fare_bdt = 418.00,
        updated_at = NOW();

    -- ---------------------------------------------------------------------
    -- 4. INSERT RIDE REQUESTS (PRD Overlapping Scenario + 30s Late Competitor)
    -- ---------------------------------------------------------------------
    -- 4a. Nusrat's Request (Banani Rd 11 -> Mohakhali/Gulshan, requested at T0)
    INSERT INTO ride_requests (
        id, passenger_id, pickup_address, pickup_lat, pickup_lng,
        dropoff_address, dropoff_lat, dropoff_lng, requested_seats,
        status, pool_id, estimated_distance_km, fare_bdt, requested_at, updated_at
    )
    VALUES (
        v_req_nusrat_id,
        v_nusrat_id,
        'Banani Road 11 (House 42)',
        23.7937000,
        90.4046000,
        'Mohakhali Flyover / Gulshan Link',
        23.7780000,
        90.4000000,
        1,
        'MATCHED',
        v_pool_bullet_id,
        10.00,
        224.00,
        t_nusrat,
        t_nusrat + INTERVAL '2 seconds'
    )
    ON CONFLICT (id) DO UPDATE SET
        status = 'MATCHED',
        pool_id = v_pool_bullet_id,
        fare_bdt = 224.00,
        updated_at = NOW();

    -- 4b. Rafiq's Overlapping Request (Banani Block E -> Mohakhali/Gulshan, requested at T0 + 5s)
    INSERT INTO ride_requests (
        id, passenger_id, pickup_address, pickup_lat, pickup_lng,
        dropoff_address, dropoff_lat, dropoff_lng, requested_seats,
        status, pool_id, estimated_distance_km, fare_bdt, requested_at, updated_at
    )
    VALUES (
        v_req_rafiq_id,
        v_rafiq_id,
        'Banani Block E / Kemal Ataturk Ave',
        23.7925000,
        90.4078000,
        'Gulshan-1 Circle / Mohakhali Intersection',
        23.7790000,
        90.4180000,
        1,
        'MATCHED',
        v_pool_bullet_id,
        8.50,
        194.00,
        t_rafiq,
        t_rafiq + INTERVAL '2 seconds'
    )
    ON CONFLICT (id) DO UPDATE SET
        status = 'MATCHED',
        pool_id = v_pool_bullet_id,
        fare_bdt = 194.00,
        updated_at = NOW();

    -- 4c. Shirin's Request (Arriving EXACTLY 30 seconds later to compete for the last seat!)
    -- Status: REQUESTED / PENDING, pool_id: NULL (unallocated, competing for the 1 remaining seat)
    INSERT INTO ride_requests (
        id, passenger_id, pickup_address, pickup_lat, pickup_lng,
        dropoff_address, dropoff_lat, dropoff_lng, requested_seats,
        status, pool_id, estimated_distance_km, fare_bdt, requested_at, updated_at
    )
    VALUES (
        v_req_shirin_id,
        v_shirin_id,
        'Banani Chairman Bari Bus Stop',
        23.7910000,
        90.4020000,
        'Mohakhali Wireless Gate / Gulshan South',
        23.7770000,
        90.4010000,
        1,
        'REQUESTED', -- Competing for the 1 remaining seat on Bullet
        NULL,        -- Not yet matched
        6.80,
        160.00,      -- Preliminary estimate
        t_shirin,    -- EXACTLY 30 seconds after Nusrat!
        t_shirin
    )
    ON CONFLICT (id) DO UPDATE SET
        status = 'REQUESTED',
        pool_id = NULL,
        requested_at = t_shirin,
        updated_at = NOW();

    -- ---------------------------------------------------------------------
    -- 5. INSERT POOL MEMBERS (Nusrat & Rafiq Occupying 2 Seats on Bullet)
    -- ---------------------------------------------------------------------
    -- Nusrat: Seat 1
    INSERT INTO pool_members (
        id, pool_id, ride_request_id, passenger_id, seats_reserved,
        pickup_order, dropoff_order, member_status, joined_at
    )
    VALUES (
        v_mem_nusrat_id,
        v_pool_bullet_id,
        v_req_nusrat_id,
        v_nusrat_id,
        1,
        1,
        2,
        'BOOKED',
        t_nusrat + INTERVAL '2 seconds'
    )
    ON CONFLICT (ride_request_id) DO UPDATE SET
        pool_id = v_pool_bullet_id,
        seats_reserved = 1,
        member_status = 'BOOKED';

    -- Rafiq: Seat 2
    INSERT INTO pool_members (
        id, pool_id, ride_request_id, passenger_id, seats_reserved,
        pickup_order, dropoff_order, member_status, joined_at
    )
    VALUES (
        v_mem_rafiq_id,
        v_pool_bullet_id,
        v_req_rafiq_id,
        v_rafiq_id,
        1,
        2,
        1,
        'BOOKED',
        t_rafiq + INTERVAL '2 seconds'
    )
    ON CONFLICT (ride_request_id) DO UPDATE SET
        pool_id = v_pool_bullet_id,
        seats_reserved = 1,
        member_status = 'BOOKED';

    -- ---------------------------------------------------------------------
    -- 6. INSERT FARES (Nusrat & Rafiq with 20% Pool Discount)
    -- ---------------------------------------------------------------------
    -- Nusrat: Base 30, Dist 10.0km @ 25 BDT/km -> Gross 280 -> 20% Disc (56) = 224 BDT (22,400 paisa)
    INSERT INTO fares (
        id, ride_request_id, pool_id, base_fare, distance_km, per_km_rate,
        pool_discount_pct, final_fare, currency, calculated_at
    )
    VALUES (
        v_fare_nusrat_id,
        v_req_nusrat_id,
        v_pool_bullet_id,
        30.00,
        10.00,
        25.00,
        20.00,
        224.00,
        'BDT',
        t_nusrat + INTERVAL '2 seconds'
    )
    ON CONFLICT (ride_request_id) DO UPDATE SET
        final_fare = 224.00,
        pool_discount_pct = 20.00;

    -- Rafiq: Base 30, Dist 8.5km @ 25 BDT/km -> Gross 242.50 -> 20% Disc (48.50) = 194.00 BDT (19,400 paisa)
    INSERT INTO fares (
        id, ride_request_id, pool_id, base_fare, distance_km, per_km_rate,
        pool_discount_pct, final_fare, currency, calculated_at
    )
    VALUES (
        v_fare_rafiq_id,
        v_req_rafiq_id,
        v_pool_bullet_id,
        30.00,
        8.50,
        25.00,
        20.00,
        194.00,
        'BDT',
        t_rafiq + INTERVAL '2 seconds'
    )
    ON CONFLICT (ride_request_id) DO UPDATE SET
        final_fare = 194.00,
        pool_discount_pct = 20.00;

    -- ---------------------------------------------------------------------
    -- 7. INSERT AUDIT LOGS (ride_status_history)
    -- ---------------------------------------------------------------------
    INSERT INTO ride_status_history (id, ride_request_id, pool_id, old_status, new_status, changed_by_user_id, reason_or_notes, created_at)
    VALUES
        (gen_random_uuid(), v_req_nusrat_id, NULL, NULL, 'REQUESTED', v_nusrat_id, 'Nusrat initiated ride request from Banani Rd 11', t_nusrat),
        (gen_random_uuid(), v_req_nusrat_id, v_pool_bullet_id, 'REQUESTED', 'MATCHED', v_jashim_id, 'Matched to Bullet (Seat 1 reserved)', t_nusrat + INTERVAL '2 seconds'),
        (gen_random_uuid(), v_req_rafiq_id, NULL, NULL, 'REQUESTED', v_rafiq_id, 'Rafiq initiated overlapping ride request from Banani Block E', t_rafiq),
        (gen_random_uuid(), v_req_rafiq_id, v_pool_bullet_id, 'REQUESTED', 'MATCHED', v_jashim_id, 'Matched to Bullet (Seat 2 reserved, 1 seat remaining)', t_rafiq + INTERVAL '2 seconds'),
        (gen_random_uuid(), v_req_shirin_id, NULL, NULL, 'REQUESTED', v_shirin_id, 'Shirin requested ride 30s later; competing for last available seat on Bullet', t_shirin)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'PRD Scenario Seed successfully applied:';
    RAISE NOTICE ' - Driver: Jashim Uddin';
    RAISE NOTICE ' - Vehicle: Bullet (Tesla Model 3, total_seat_capacity = 3)';
    RAISE NOTICE ' - Pool: Bullet (max_seats = 3, available_seats = 1, corridor = Banani -> Mohakhali/Gulshan)';
    RAISE NOTICE ' - Passenger 1: Nusrat Jahan (MATCHED, 1 seat, Banani -> Mohakhali, 224 BDT)';
    RAISE NOTICE ' - Passenger 2: Rafiqul Islam (MATCHED, 1 seat, Banani -> Mohakhali/Gulshan, 194 BDT)';
    RAISE NOTICE ' - Passenger 3: Shirin Akter (REQUESTED 30s later at %, COMPETING for last 1 seat)', t_shirin;
END $$;
