import { SchemaTable, RelationshipExplanation } from '../types';

export const COMPONENT_MERMAID = `graph TB
    subgraph Clients["1. Client Layer (Browser)"]
        PassengerApp["Passenger Web App<br/>(Vite + React SPA)"]
        DriverApp["Driver Tesla Console<br/>(Vite + React SPA)"]
        AdminApp["Operations Dashboard<br/>(Vite + React SPA)"]
    end

    subgraph Ingress["2. Edge / Ingress Layer"]
        NginxGateway["Nginx Reverse Proxy / Load Balancer<br/>Port 80/443 (SSL Termination & Static Assets)"]
    end

    subgraph BackendApp["3. Node.js API Service (Express or Fastify)"]
        subgraph GatewayRouting["API Gateway & Real-Time Transport"]
            AuthMw["JWT Auth & Role-Based Guard<br/>(Passenger / Driver / Admin)"]
            HttpControllers["REST API Routing Layer<br/>(/api/v1/rides, /pools, /vehicles)"]
            SocketGateway["WebSocket / Socket.io Engine<br/>(Real-Time GPS Tracking & Status Broadcast)"]
        end

        subgraph CoreDomain["Core Ride-Pooling Domain Services"]
            PoolMatcher["Pool Matching & Routing Engine<br/>• Corridor Overlap Filter (Dhaka routes)<br/>• Detour Constraint (detour <= 1.30x)<br/>• Seat Capacity Validator (<= 4 seats)"]
            FareEngine["Dynamic Pooling Fare Engine<br/>• Base Fare + Distance (BDT/km)<br/>• Occupancy Pooling Discount (20-40%)"]
            Dispatcher["Driver Dispatcher & Trip State Machine<br/>• FORMING -> DISPATCHED -> IN_PROGRESS -> COMPLETED"]
        end

        subgraph DataAccess["Persistence & Cache Abstraction"]
            DBAccess["Database Client / ORM (Kysely / Knex / pg)<br/>(ACID Transactions, Row Locks: SELECT ... FOR UPDATE)"]
            RedisClient["Redis Client (ioredis)<br/>(Distributed Redlock, Pub/Sub & Geospatial)"]
        end
    end

    subgraph MemoryLayer["4. In-Memory Cache & Message Broker (Docker)"]
        RedisInstance[("Redis 7 (In-Memory Engine)<br/>• GEOADD / GEORADIUS (Dhaka Driver Positions)<br/>• Distributed Lock: Redlock on pool:seat:reservation<br/>• Pub/Sub: Trip & Driver Location Streaming")]
    end

    subgraph StorageLayer["5. Persistent Relational Store (Docker)"]
        PostgresInstance[("PostgreSQL 16 + PostGIS<br/>• Spatial Indexing (GIST on lat/lng coordinates)<br/>• Strict B-Tree Indexes on Foreign Keys & Status<br/>• Check Constraints (Seat bounds 1-4, Ratings 1-5)<br/>• Immutable Audit Logging (ride_status_history)")]
    end

    Clients -->|HTTPS REST API / WSS| NginxGateway
    NginxGateway -->|Reverse Proxy HTTP :3000| HttpControllers
    NginxGateway -->|WebSocket Upgrade :3000| SocketGateway
    HttpControllers --> AuthMw
    AuthMw --> CoreDomain
    SocketGateway <--> RedisClient
    PoolMatcher --> RedisClient
    PoolMatcher --> DBAccess
    Dispatcher --> DBAccess
    FareEngine --> DBAccess
    RedisClient <--> RedisInstance
    DBAccess <-->|Connection Pool (pg.Pool)| PostgresInstance
`;

export const ERD_MERMAID = `erDiagram
    users ||--o| vehicles : "operates (1:1)"
    users ||--o{ ride_requests : "requests (1:N)"
    users ||--o{ pools : "captains (1:N)"
    vehicles ||--o{ pools : "assigned_to (1:N)"
    pools ||--|{ pool_members : "contains (1:N)"
    ride_requests ||--o| pool_members : "allocated_in (1:1)"
    ride_requests ||--o{ ride_status_history : "logs_state (1:N)"
    pools ||--o{ ride_status_history : "logs_state (1:N)"
    ride_requests ||--|| fares : "incurs (1:1)"
    pools ||--o{ fares : "aggregates (1:N)"
    ride_requests ||--o{ payments : "settles (1:N)"
    fares ||--o{ payments : "clears (1:N)"
    ride_requests ||--o{ ratings : "reviewed_in (1:N)"
    pools ||--o{ ratings : "scored_in (1:N)"
    users ||--o{ ratings : "submits_or_receives (1:N)"

    users {
        uuid id PK
        varchar email UK "Indexed"
        varchar phone UK "Indexed"
        varchar password_hash
        varchar full_name
        varchar role "passenger | driver | admin"
        numeric rating_avg "1.00 - 5.00"
        timestamp created_at
        timestamp updated_at
    }

    vehicles {
        uuid id PK
        uuid driver_id FK,UK "One vehicle per driver"
        varchar make "Tesla"
        varchar model "Model 3 | Model Y | Model S | Model X"
        varchar license_plate UK "Dhaka Metro registration"
        int total_seat_capacity "CHECK capacity BETWEEN 1 AND 7"
        varchar status "ACTIVE | INACTIVE | MAINTENANCE"
        timestamp created_at
        timestamp updated_at
    }

    ride_requests {
        uuid id PK
        uuid passenger_id FK "References users(id)"
        varchar pickup_address
        numeric pickup_lat "Latitude (e.g. 23.7925)"
        numeric pickup_lng "Longitude (e.g. 90.4078)"
        varchar dropoff_address
        numeric dropoff_lat "Latitude (e.g. 23.7275)"
        numeric dropoff_lng "Longitude (e.g. 90.4194)"
        int requested_seats "CHECK requested_seats BETWEEN 1 AND 4"
        varchar status "PENDING | MATCHED | PICKED_UP | COMPLETED | CANCELLED"
        uuid pool_id FK "Nullable assigned pool"
        timestamp requested_at
        timestamp updated_at
    }

    pools {
        uuid id PK
        uuid driver_id FK "References users(id)"
        uuid vehicle_id FK "References vehicles(id)"
        int max_seats "Tesla passenger capacity"
        int available_seats "Dynamic seats remaining"
        varchar status "FORMING | DISPATCHED | IN_PROGRESS | COMPLETED | CANCELLED"
        text route_polyline "Encoded corridor waypoints"
        numeric total_distance_km
        numeric total_pool_fare_bdt
        timestamp scheduled_departure
        timestamp started_at
        timestamp completed_at
        timestamp created_at
    }

    pool_members {
        uuid id PK
        uuid pool_id FK "ON DELETE CASCADE"
        uuid ride_request_id FK,UK "One active membership per request"
        uuid passenger_id FK "References users(id)"
        int seats_reserved "Seats taken by this passenger"
        int pickup_order "Sequence in route"
        int dropoff_order "Sequence in route"
        varchar member_status "BOOKED | BOARDED | DROPPED_OFF | CANCELLED"
        timestamp joined_at
    }

    ride_status_history {
        uuid id PK
        uuid ride_request_id FK "Nullable"
        uuid pool_id FK "Nullable"
        varchar old_status
        varchar new_status
        uuid changed_by_user_id FK "Audit actor"
        text reason_or_notes
        timestamp created_at
    }

    fares {
        uuid id PK
        uuid ride_request_id FK,UK "One fare per ride request"
        uuid pool_id FK "Associated pool"
        numeric base_fare "BDT"
        numeric distance_km
        numeric per_km_rate "BDT/km"
        numeric pool_discount_pct "e.g. 30%"
        numeric final_fare "BDT after discount"
        varchar currency "BDT"
        timestamp calculated_at
    }

    payments {
        uuid id PK
        uuid ride_request_id FK "References ride_requests(id)"
        uuid passenger_id FK "References users(id)"
        uuid fare_id FK "References fares(id)"
        numeric amount "BDT"
        varchar payment_method "BKASH | NAGAD | CARD | CASH"
        varchar transaction_id UK "Gateway reference"
        varchar status "PENDING | SUCCESS | FAILED | REFUNDED"
        timestamp paid_at
    }

    ratings {
        uuid id PK
        uuid pool_id FK "References pools(id)"
        uuid ride_request_id FK "References ride_requests(id)"
        uuid rater_user_id FK "Submitting user"
        uuid ratee_user_id FK "Target user"
        int rating_score "CHECK rating_score BETWEEN 1 AND 5"
        text comment
        timestamp created_at
    }
`;

export const RELATIONSHIPS_LIST: RelationshipExplanation[] = [
  {
    source: 'users (Driver)',
    target: 'vehicles',
    type: 'One-to-One',
    foreignKey: 'vehicles.driver_id -> users.id (UNIQUE)',
    explanation: 'Each active driver operates exactly one registered Tesla vehicle, ensuring verifiable ownership, license validation, and guaranteed seat capacity constraints.',
    businessRule: 'A driver cannot register multiple concurrent active vehicles in the MVP pool fleet.'
  },
  {
    source: 'users (Passenger)',
    target: 'ride_requests',
    type: 'One-to-Many',
    foreignKey: 'ride_requests.passenger_id -> users.id',
    explanation: 'A passenger can create multiple ride requests over time across Dhaka, but business logic restricts them to at most one active (PENDING/MATCHED/IN_PROGRESS) request at a time.',
    businessRule: 'Partial unique index on passenger_id WHERE status IN (\'PENDING\', \'MATCHED\', \'PICKED_UP\') enforces single active ride.'
  },
  {
    source: 'users (Driver)',
    target: 'pools',
    type: 'One-to-Many',
    foreignKey: 'pools.driver_id -> users.id',
    explanation: 'A driver executes many sequential ride pools throughout their shift, while only one pool can be actively FORMING, DISPATCHED, or IN_PROGRESS at any given moment.',
    businessRule: 'Enforced via partial unique index on driver_id WHERE status IN (\'FORMING\', \'DISPATCHED\', \'IN_PROGRESS\').'
  },
  {
    source: 'vehicles',
    target: 'pools',
    type: 'One-to-Many',
    foreignKey: 'pools.vehicle_id -> vehicles.id',
    explanation: 'A Tesla vehicle is assigned to numerous pools over its operational lifespan, dictating the physical seat ceiling (e.g. 4 passenger seats in Model 3/Y).',
    businessRule: 'Pools dynamically copy total_seat_capacity as max_seats to protect against retroactive vehicle spec modifications.'
  },
  {
    source: 'pools',
    target: 'pool_members',
    type: 'One-to-Many',
    foreignKey: 'pool_members.pool_id -> pools.id',
    explanation: 'A single pooled ride contains 1 to N passenger memberships sharing the vehicle cabin, specifying each passenger\'s seat allotment, boarding order, and dropoff sequence.',
    businessRule: 'Strict invariant: SUM(seats_reserved) across active pool members must never exceed pools.max_seats.'
  },
  {
    source: 'ride_requests',
    target: 'pool_members',
    type: 'One-to-One',
    foreignKey: 'pool_members.ride_request_id -> ride_requests.id (UNIQUE)',
    explanation: 'An individual passenger ride request maps to exactly one pool membership when successfully paired by the corridor matching algorithm.',
    businessRule: 'The UNIQUE constraint ensures a passenger\'s request is never assigned to two competing Tesla pools simultaneously.'
  },
  {
    source: 'ride_requests / pools',
    target: 'ride_status_history',
    type: 'One-to-Many',
    foreignKey: 'ride_status_history.ride_request_id / pool_id -> requests/pools',
    explanation: 'Every lifecycle transition (e.g., FORMING -> DISPATCHED -> COMPLETED, or PENDING -> MATCHED -> BOARDED) is recorded immutably with timestamp and actor ID for auditability and SLA compliance.',
    businessRule: 'Append-only audit table with no UPDATE or DELETE privileges granted in application production roles.'
  },
  {
    source: 'ride_requests',
    target: 'fares',
    type: 'One-to-One',
    foreignKey: 'fares.ride_request_id -> ride_requests.id (UNIQUE)',
    explanation: 'Each passenger has a dedicated fare record computing their personalized trip cost with transparent pooling discounts (e.g. 25-40% discount for sharing seats).',
    businessRule: 'Fares link back to pool_id so revenue reconciliation between pool sum and driver payout is easily audited.'
  },
  {
    source: 'fares',
    target: 'payments',
    type: 'One-to-Many',
    foreignKey: 'payments.fare_id -> fares.id',
    explanation: 'A fare can be settled through local payment rails (bKash, Nagad, Card, or Cash), with one-to-many allowing handling of retries, split payments, or refunds upon failed transactions.',
    businessRule: 'Payment success updates ride_request status and unlocks digital trip receipts.'
  },
  {
    source: 'ride_requests / pools',
    target: 'ratings',
    type: 'One-to-Many',
    foreignKey: 'ratings.ride_request_id / pool_id -> requests/pools',
    explanation: 'A two-way feedback mechanism enabling passengers to rate the Tesla driver and vehicle cleanliness, and drivers to rate passenger etiquette (1-5 stars with comments).',
    businessRule: 'Constrained by CHECK (rating_score BETWEEN 1 AND 5) and foreign keys rater_user_id and ratee_user_id.'
  }
];

export const SCHEMA_TABLES: SchemaTable[] = [
  {
    id: 'users',
    name: 'users',
    category: 'core',
    description: 'Central identity table holding passengers, drivers, and fleet operators with cryptographic credentials and aggregated ratings.',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPrimary: true, defaultVal: 'gen_random_uuid()', description: 'Primary key (UUIDv4)' },
      { name: 'email', type: 'VARCHAR(255)', nullable: false, constraints: 'UNIQUE', description: 'Unique email address for authentication' },
      { name: 'phone', type: 'VARCHAR(32)', nullable: false, constraints: 'UNIQUE', description: 'Bangladeshi phone (+8801XXXXXXXXX) for OTP verification' },
      { name: 'password_hash', type: 'VARCHAR(255)', nullable: false, description: 'Argon2id or bcrypt password hash' },
      { name: 'full_name', type: 'VARCHAR(120)', nullable: false, description: 'User display name' },
      { name: 'role', type: 'VARCHAR(20)', nullable: false, constraints: "CHECK (role IN ('passenger', 'driver', 'admin'))", description: 'Actor role in the system' },
      { name: 'rating_avg', type: 'NUMERIC(3,2)', nullable: false, defaultVal: '5.00', constraints: 'CHECK (rating_avg BETWEEN 1.00 AND 5.00)', description: 'Cached rolling average rating' },
      { name: 'is_active', type: 'BOOLEAN', nullable: false, defaultVal: 'true', description: 'Account status / soft ban' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Registration timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Last modification timestamp' }
    ],
    indexes: [
      { name: 'idx_users_email', type: 'UNIQUE', columns: ['email'], purpose: 'Fast login lookup' },
      { name: 'idx_users_phone', type: 'UNIQUE', columns: ['phone'], purpose: 'Fast SMS/OTP login lookup' },
      { name: 'idx_users_role', type: 'BTREE', columns: ['role'], purpose: 'Filter drivers vs passengers' }
    ],
    constraints: [
      'PRIMARY KEY (id)',
      'UNIQUE (email)',
      'UNIQUE (phone)',
      "CHECK (role IN ('passenger', 'driver', 'admin'))",
      'CHECK (rating_avg >= 1.00 AND rating_avg <= 5.00)'
    ]
  },
  {
    id: 'vehicles',
    name: 'vehicles',
    category: 'core',
    description: 'Fleet assets (Tesla vehicles) operated by verified drivers, defining strict passenger seat capacity (typically 4 for Model 3/Y).',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPrimary: true, defaultVal: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'driver_id', type: 'UUID', nullable: false, isForeign: true, references: 'users(id)', constraints: 'UNIQUE', description: 'Assigned driver (1:1 relationship)' },
      { name: 'make', type: 'VARCHAR(50)', nullable: false, defaultVal: "'Tesla'", description: 'Vehicle manufacturer' },
      { name: 'model', type: 'VARCHAR(50)', nullable: false, description: "Tesla Model ('Model 3', 'Model Y', 'Model S', 'Model X')" },
      { name: 'year', type: 'INT', nullable: false, description: 'Manufacturing year' },
      { name: 'color', type: 'VARCHAR(30)', nullable: false, description: 'Exterior color (Pearl White, Solid Black, Midnight Silver, etc.)' },
      { name: 'license_plate', type: 'VARCHAR(50)', nullable: false, constraints: 'UNIQUE', description: 'BRTA registration e.g. DHAKA-METRO-GA-11-2233' },
      { name: 'total_seat_capacity', type: 'INT', nullable: false, defaultVal: '4', constraints: 'CHECK (total_seat_capacity BETWEEN 1 AND 7)', description: 'Available passenger seats (excluding driver)' },
      { name: 'battery_level_pct', type: 'INT', nullable: true, constraints: 'CHECK (battery_level_pct BETWEEN 0 AND 100)', description: 'Real-time telemetry battery SOC %' },
      { name: 'status', type: 'VARCHAR(20)', nullable: false, defaultVal: "'ACTIVE'", constraints: "CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE'))", description: 'Fleet readiness state' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Vehicle registration date' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Last telemetry or status update' }
    ],
    indexes: [
      { name: 'idx_vehicles_driver_id', type: 'UNIQUE', columns: ['driver_id'], purpose: 'Enforce one vehicle per active driver' },
      { name: 'idx_vehicles_license_plate', type: 'UNIQUE', columns: ['license_plate'], purpose: 'Verify official registration' },
      { name: 'idx_vehicles_status', type: 'BTREE', columns: ['status'], purpose: 'Quickly query active Tesla fleet' }
    ],
    constraints: [
      'PRIMARY KEY (id)',
      'FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE RESTRICT',
      'UNIQUE (driver_id)',
      'UNIQUE (license_plate)',
      'CHECK (total_seat_capacity >= 1 AND total_seat_capacity <= 7)',
      "CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE'))"
    ]
  },
  {
    id: 'ride_requests',
    name: 'ride_requests',
    category: 'ride',
    description: 'Individual trip demands created by passengers, capturing GPS coordinates, requested seat count, and lifecycle state.',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPrimary: true, defaultVal: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'passenger_id', type: 'UUID', nullable: false, isForeign: true, references: 'users(id)', description: 'Passenger booking the ride' },
      { name: 'pickup_address', type: 'VARCHAR(255)', nullable: false, description: 'Human-readable pickup spot (e.g. Gulshan-2 Circle)' },
      { name: 'pickup_lat', type: 'NUMERIC(10,7)', nullable: false, description: 'Pickup GPS latitude (e.g. 23.7925000)' },
      { name: 'pickup_lng', type: 'NUMERIC(10,7)', nullable: false, description: 'Pickup GPS longitude (e.g. 90.4078000)' },
      { name: 'dropoff_address', type: 'VARCHAR(255)', nullable: false, description: 'Human-readable destination (e.g. Motijheel C/A)' },
      { name: 'dropoff_lat', type: 'NUMERIC(10,7)', nullable: false, description: 'Dropoff GPS latitude (e.g. 23.7275000)' },
      { name: 'dropoff_lng', type: 'NUMERIC(10,7)', nullable: false, description: 'Dropoff GPS longitude (e.g. 90.4194000)' },
      { name: 'requested_seats', type: 'INT', nullable: false, defaultVal: '1', constraints: 'CHECK (requested_seats BETWEEN 1 AND 4)', description: 'Passenger seats requested (1 to 4)' },
      { name: 'status', type: 'VARCHAR(25)', nullable: false, defaultVal: "'PENDING'", constraints: "CHECK (status IN ('PENDING', 'MATCHED', 'PICKED_UP', 'COMPLETED', 'CANCELLED'))", description: 'Trip request lifecycle state' },
      { name: 'pool_id', type: 'UUID', nullable: true, isForeign: true, references: 'pools(id)', description: 'Assigned shared pool ID when matched' },
      { name: 'estimated_distance_km', type: 'NUMERIC(6,2)', nullable: false, description: 'Calculated direct route distance in kilometers' },
      { name: 'requested_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Status update timestamp' }
    ],
    indexes: [
      { name: 'idx_ride_requests_passenger_status', type: 'BTREE', columns: ['passenger_id', 'status'], purpose: 'Verify passenger active ride restriction' },
      { name: 'idx_ride_requests_status', type: 'BTREE', columns: ['status'], purpose: 'Corridor matching worker polling for PENDING requests' },
      { name: 'idx_ride_requests_pool_id', type: 'BTREE', columns: ['pool_id'], purpose: 'Lookup all requests linked to a pool' },
      { name: 'idx_ride_requests_pickup_coords', type: 'BTREE', columns: ['pickup_lat', 'pickup_lng'], purpose: 'Spatial corridor matching index' }
    ],
    constraints: [
      'PRIMARY KEY (id)',
      'FOREIGN KEY (passenger_id) REFERENCES users(id) ON DELETE RESTRICT',
      'FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE SET NULL',
      'CHECK (requested_seats >= 1 AND requested_seats <= 4)',
      "CHECK (status IN ('PENDING', 'MATCHED', 'PICKED_UP', 'COMPLETED', 'CANCELLED'))"
    ]
  },
  {
    id: 'pools',
    name: 'pools',
    category: 'ride',
    description: 'Shared vehicle trips grouping 1-4 passengers inside a single Tesla, managing route waypoints and real-time seat inventory.',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPrimary: true, defaultVal: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'driver_id', type: 'UUID', nullable: false, isForeign: true, references: 'users(id)', description: 'Tesla driver executing the pool' },
      { name: 'vehicle_id', type: 'UUID', nullable: false, isForeign: true, references: 'vehicles(id)', description: 'Assigned Tesla vehicle asset' },
      { name: 'max_seats', type: 'INT', nullable: false, description: 'Copied from vehicle capacity (e.g. 4 seats)' },
      { name: 'available_seats', type: 'INT', nullable: false, constraints: 'CHECK (available_seats >= 0 AND available_seats <= max_seats)', description: 'Unreserved seats currently open for pooling' },
      { name: 'status', type: 'VARCHAR(25)', nullable: false, defaultVal: "'FORMING'", constraints: "CHECK (status IN ('FORMING', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))", description: 'Pool trip lifecycle stage' },
      { name: 'route_polyline', type: 'TEXT', nullable: true, description: 'Merged route geometry string (Google Polyline / GeoJSON)' },
      { name: 'total_distance_km', type: 'NUMERIC(6,2)', nullable: true, description: 'Overall pooled journey distance' },
      { name: 'total_pool_fare_bdt', type: 'NUMERIC(10,2)', nullable: false, defaultVal: '0.00', description: 'Aggregate gross fare of all pooled passengers' },
      { name: 'started_at', type: 'TIMESTAMPTZ', nullable: true, description: 'When driver starts the pool journey' },
      { name: 'completed_at', type: 'TIMESTAMPTZ', nullable: true, description: 'When final passenger is dropped off' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Pool creation time' }
    ],
    indexes: [
      { name: 'idx_pools_driver_status', type: 'BTREE', columns: ['driver_id', 'status'], purpose: 'Fast lookup of driver active pool' },
      { name: 'idx_pools_status_available_seats', type: 'BTREE', columns: ['status', 'available_seats'], purpose: 'Matching engine queries FORMING pools with open seats' },
      { name: 'idx_pools_created_at', type: 'BTREE', columns: ['created_at'], purpose: 'Timeline sorting and cleanup cron jobs' }
    ],
    constraints: [
      'PRIMARY KEY (id)',
      'FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE RESTRICT',
      'FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE RESTRICT',
      'CHECK (available_seats >= 0 AND available_seats <= max_seats)',
      "CHECK (status IN ('FORMING', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))"
    ]
  },
  {
    id: 'pool_members',
    name: 'pool_members',
    category: 'ride',
    description: 'Intersection table binding a passenger ride request to an active pool, locking seat count and sequencing pickup/dropoff order.',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPrimary: true, defaultVal: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'pool_id', type: 'UUID', nullable: false, isForeign: true, references: 'pools(id)', description: 'Parent pool trip' },
      { name: 'ride_request_id', type: 'UUID', nullable: false, isForeign: true, references: 'ride_requests(id)', constraints: 'UNIQUE', description: 'Unique passenger ride request' },
      { name: 'passenger_id', type: 'UUID', nullable: false, isForeign: true, references: 'users(id)', description: 'Passenger user ID for fast joins' },
      { name: 'seats_reserved', type: 'INT', nullable: false, constraints: 'CHECK (seats_reserved BETWEEN 1 AND 4)', description: 'Seats booked by this passenger' },
      { name: 'pickup_order', type: 'INT', nullable: false, description: 'Corridor stop sequence for pickup (1, 2, 3...)' },
      { name: 'dropoff_order', type: 'INT', nullable: false, description: 'Corridor stop sequence for dropoff (1, 2, 3...)' },
      { name: 'member_status', type: 'VARCHAR(25)', nullable: false, defaultVal: "'BOOKED'", constraints: "CHECK (member_status IN ('BOOKED', 'BOARDED', 'DROPPED_OFF', 'CANCELLED'))", description: 'Individual passenger progress inside pool' },
      { name: 'joined_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Timestamp when match was confirmed' }
    ],
    indexes: [
      { name: 'idx_pool_members_pool_id', type: 'BTREE', columns: ['pool_id'], purpose: 'Fetch all manifest members for a pool' },
      { name: 'idx_pool_members_request_id', type: 'UNIQUE', columns: ['ride_request_id'], purpose: 'Prevent duplicate pool assignments' },
      { name: 'idx_pool_members_passenger_id', type: 'BTREE', columns: ['passenger_id'], purpose: 'User trip history query' }
    ],
    constraints: [
      'PRIMARY KEY (id)',
      'FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE',
      'FOREIGN KEY (ride_request_id) REFERENCES ride_requests(id) ON DELETE RESTRICT',
      'FOREIGN KEY (passenger_id) REFERENCES users(id) ON DELETE RESTRICT',
      'UNIQUE (ride_request_id)',
      'CHECK (seats_reserved >= 1 AND seats_reserved <= 4)',
      "CHECK (member_status IN ('BOOKED', 'BOARDED', 'DROPPED_OFF', 'CANCELLED'))"
    ]
  },
  {
    id: 'ride_status_history',
    name: 'ride_status_history',
    category: 'audit',
    description: 'Immutable time-series ledger of all state transitions across ride requests and pools for compliance, analytics, and debugging.',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPrimary: true, defaultVal: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'ride_request_id', type: 'UUID', nullable: true, isForeign: true, references: 'ride_requests(id)', description: 'Associated ride request (optional)' },
      { name: 'pool_id', type: 'UUID', nullable: true, isForeign: true, references: 'pools(id)', description: 'Associated pool (optional)' },
      { name: 'old_status', type: 'VARCHAR(30)', nullable: true, description: 'Previous state before change' },
      { name: 'new_status', type: 'VARCHAR(30)', nullable: false, description: 'New state recorded' },
      { name: 'changed_by_user_id', type: 'UUID', nullable: true, isForeign: true, references: 'users(id)', description: 'Actor initiating change (or NULL for system matching engine)' },
      { name: 'reason_or_notes', type: 'TEXT', nullable: true, description: 'Audit notes (e.g. Passenger cancelled: wait time exceeded)' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Immutable event timestamp' }
    ],
    indexes: [
      { name: 'idx_history_request_id', type: 'BTREE', columns: ['ride_request_id'], purpose: 'Audit timeline for specific passenger ride' },
      { name: 'idx_history_pool_id', type: 'BTREE', columns: ['pool_id'], purpose: 'Audit timeline for pool lifecycle' },
      { name: 'idx_history_created_at', type: 'BTREE', columns: ['created_at'], purpose: 'Time-range analytics and SLA monitoring' }
    ],
    constraints: [
      'PRIMARY KEY (id)',
      'FOREIGN KEY (ride_request_id) REFERENCES ride_requests(id) ON DELETE CASCADE',
      'FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE',
      'FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL'
    ]
  },
  {
    id: 'fares',
    name: 'fares',
    category: 'billing',
    description: 'Detailed billing breakdown for each passenger request, factoring in base rate, kilometers, and the ride-pooling discount percentage.',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPrimary: true, defaultVal: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'ride_request_id', type: 'UUID', nullable: false, isForeign: true, references: 'ride_requests(id)', constraints: 'UNIQUE', description: '1:1 link to passenger ride' },
      { name: 'pool_id', type: 'UUID', nullable: false, isForeign: true, references: 'pools(id)', description: 'Pool context for pricing formula' },
      { name: 'base_fare', type: 'NUMERIC(10,2)', nullable: false, defaultVal: '150.00', description: 'Fixed base dispatch fare in BDT (Tesla premium baseline)' },
      { name: 'distance_km', type: 'NUMERIC(6,2)', nullable: false, description: 'Calculated billed distance' },
      { name: 'per_km_rate', type: 'NUMERIC(6,2)', nullable: false, defaultVal: '45.00', description: 'Standard BDT per km rate' },
      { name: 'pool_discount_pct', type: 'NUMERIC(4,2)', nullable: false, defaultVal: '30.00', constraints: 'CHECK (pool_discount_pct BETWEEN 0.00 AND 60.00)', description: 'Pooling incentive discount (e.g. 30%)' },
      { name: 'final_fare', type: 'NUMERIC(10,2)', nullable: false, description: 'Billed amount = (base + km * rate) * (1 - discount)' },
      { name: 'currency', type: 'VARCHAR(10)', nullable: false, defaultVal: "'BDT'", description: 'Currency code (Bangladeshi Taka)' },
      { name: 'calculated_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Timestamp when fare locked' }
    ],
    indexes: [
      { name: 'idx_fares_ride_request_id', type: 'UNIQUE', columns: ['ride_request_id'], purpose: 'Enforce one fare record per passenger ride' },
      { name: 'idx_fares_pool_id', type: 'BTREE', columns: ['pool_id'], purpose: 'Aggregate pool trip revenue queries' }
    ],
    constraints: [
      'PRIMARY KEY (id)',
      'FOREIGN KEY (ride_request_id) REFERENCES ride_requests(id) ON DELETE RESTRICT',
      'FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE RESTRICT',
      'UNIQUE (ride_request_id)',
      'CHECK (pool_discount_pct >= 0.00 AND pool_discount_pct <= 60.00)',
      'CHECK (final_fare >= 0.00)'
    ]
  },
  {
    id: 'payments',
    name: 'payments',
    category: 'billing',
    description: 'Transaction records through Bangladeshi payment gateways (bKash, Nagad) or cards/cash, linked to passenger fares.',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPrimary: true, defaultVal: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'ride_request_id', type: 'UUID', nullable: false, isForeign: true, references: 'ride_requests(id)', description: 'Associated ride request' },
      { name: 'passenger_id', type: 'UUID', nullable: false, isForeign: true, references: 'users(id)', description: 'Paying user' },
      { name: 'fare_id', type: 'UUID', nullable: false, isForeign: true, references: 'fares(id)', description: 'Fare calculation cleared' },
      { name: 'amount', type: 'NUMERIC(10,2)', nullable: false, description: 'Transaction amount in BDT' },
      { name: 'payment_method', type: 'VARCHAR(20)', nullable: false, constraints: "CHECK (payment_method IN ('BKASH', 'NAGAD', 'CARD', 'CASH'))", description: 'Gateway or settlement channel' },
      { name: 'transaction_id', type: 'VARCHAR(100)', nullable: true, constraints: 'UNIQUE', description: 'Gateway reference code (e.g. 9J47AB12)' },
      { name: 'status', type: 'VARCHAR(20)', nullable: false, defaultVal: "'PENDING'", constraints: "CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'))", description: 'Payment settlement state' },
      { name: 'paid_at', type: 'TIMESTAMPTZ', nullable: true, description: 'Confirmation timestamp from payment webhook' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Payment initialization time' }
    ],
    indexes: [
      { name: 'idx_payments_ride_request_id', type: 'BTREE', columns: ['ride_request_id'], purpose: 'Lookup payment status for ride completion' },
      { name: 'idx_payments_transaction_id', type: 'UNIQUE', columns: ['transaction_id'], purpose: 'Prevent duplicate webhook processing (idempotency)' },
      { name: 'idx_payments_status', type: 'BTREE', columns: ['status'], purpose: 'Reconciliation query for pending transactions' }
    ],
    constraints: [
      'PRIMARY KEY (id)',
      'FOREIGN KEY (ride_request_id) REFERENCES ride_requests(id) ON DELETE RESTRICT',
      'FOREIGN KEY (passenger_id) REFERENCES users(id) ON DELETE RESTRICT',
      'FOREIGN KEY (fare_id) REFERENCES fares(id) ON DELETE RESTRICT',
      "CHECK (payment_method IN ('BKASH', 'NAGAD', 'CARD', 'CASH'))",
      "CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'))"
    ]
  },
  {
    id: 'ratings',
    name: 'ratings',
    category: 'audit',
    description: 'Post-ride mutual evaluation mechanism between passengers and Tesla drivers to maintain high service quality standards.',
    columns: [
      { name: 'id', type: 'UUID', nullable: false, isPrimary: true, defaultVal: 'gen_random_uuid()', description: 'Primary key' },
      { name: 'pool_id', type: 'UUID', nullable: false, isForeign: true, references: 'pools(id)', description: 'Shared pool context' },
      { name: 'ride_request_id', type: 'UUID', nullable: false, isForeign: true, references: 'ride_requests(id)', description: 'Specific passenger ride' },
      { name: 'rater_user_id', type: 'UUID', nullable: false, isForeign: true, references: 'users(id)', description: 'User submitting score (passenger or driver)' },
      { name: 'ratee_user_id', type: 'UUID', nullable: false, isForeign: true, references: 'users(id)', description: 'User receiving rating' },
      { name: 'rating_score', type: 'INT', nullable: false, constraints: 'CHECK (rating_score BETWEEN 1 AND 5)', description: 'Score from 1 to 5 stars' },
      { name: 'comment', type: 'TEXT', nullable: true, description: 'Optional feedback comment' },
      { name: 'created_at', type: 'TIMESTAMPTZ', nullable: false, defaultVal: 'NOW()', description: 'Review submission timestamp' }
    ],
    indexes: [
      { name: 'idx_ratings_ratee', type: 'BTREE', columns: ['ratee_user_id'], purpose: 'Recalculate rolling average rating for driver or passenger' },
      { name: 'idx_ratings_request', type: 'BTREE', columns: ['ride_request_id'], purpose: 'Ensure review prompt does not re-appear once completed' }
    ],
    constraints: [
      'PRIMARY KEY (id)',
      'FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE',
      'FOREIGN KEY (ride_request_id) REFERENCES ride_requests(id) ON DELETE CASCADE',
      'FOREIGN KEY (rater_user_id) REFERENCES users(id) ON DELETE RESTRICT',
      'FOREIGN KEY (ratee_user_id) REFERENCES users(id) ON DELETE RESTRICT',
      'CHECK (rating_score >= 1 AND rating_score <= 5)'
    ]
  }
];

export const POSTGRES_DDL = `-- =========================================================================
-- DHAKA TESLA POOL MVP - COMPLETE PRODUCTION POSTGRESQL DDL
-- Database: PostgreSQL 16+ with PostGIS / UUID Extension
-- =========================================================================

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Clean teardown (for migrations / clean deploy)
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS fares CASCADE;
DROP TABLE IF EXISTS ride_status_history CASCADE;
DROP TABLE IF EXISTS pool_members CASCADE;
DROP TABLE IF EXISTS ride_requests CASCADE;
DROP TABLE IF EXISTS pools CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 3. Users Table (Passengers, Tesla Drivers, Fleet Admins)
CREATE TABLE users (
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

CREATE INDEX idx_users_role ON users(role);

-- 4. Vehicles Table (Tesla Fleet)
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    make VARCHAR(50) NOT NULL DEFAULT 'Tesla',
    model VARCHAR(50) NOT NULL, -- 'Model 3', 'Model Y', 'Model S', 'Model X'
    year INT NOT NULL,
    color VARCHAR(30) NOT NULL,
    license_plate VARCHAR(50) NOT NULL UNIQUE, -- e.g. DHAKA-METRO-GA-11-2233
    total_seat_capacity INT NOT NULL DEFAULT 4 CHECK (total_seat_capacity BETWEEN 1 AND 7),
    battery_level_pct INT CHECK (battery_level_pct BETWEEN 0 AND 100),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vehicles_status ON vehicles(status);

-- 5. Pools Table (Shared Journeys in a Tesla)
CREATE TABLE pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    max_seats INT NOT NULL CHECK (max_seats BETWEEN 1 AND 7),
    available_seats INT NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'FORMING' 
        CHECK (status IN ('FORMING', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    route_polyline TEXT,
    total_distance_km NUMERIC(6,2),
    total_pool_fare_bdt NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_pool_seats CHECK (available_seats >= 0 AND available_seats <= max_seats)
);

CREATE INDEX idx_pools_driver_status ON pools(driver_id, status);
CREATE INDEX idx_pools_forming_seats ON pools(status, available_seats) WHERE status = 'FORMING';

-- 6. Ride Requests Table (Passenger Demands)
CREATE TABLE ride_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passenger_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    pickup_address VARCHAR(255) NOT NULL,
    pickup_lat NUMERIC(10,7) NOT NULL,
    pickup_lng NUMERIC(10,7) NOT NULL,
    dropoff_address VARCHAR(255) NOT NULL,
    dropoff_lat NUMERIC(10,7) NOT NULL,
    dropoff_lng NUMERIC(10,7) NOT NULL,
    requested_seats INT NOT NULL DEFAULT 1 CHECK (requested_seats BETWEEN 1 AND 4),
    status VARCHAR(25) NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'MATCHED', 'PICKED_UP', 'COMPLETED', 'CANCELLED')),
    pool_id UUID REFERENCES pools(id) ON DELETE SET NULL,
    estimated_distance_km NUMERIC(6,2) NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ride_requests_pending ON ride_requests(status) WHERE status = 'PENDING';
CREATE INDEX idx_ride_requests_pool_id ON ride_requests(pool_id);
CREATE INDEX idx_ride_requests_pickup_coords ON ride_requests(pickup_lat, pickup_lng);

-- 7. Pool Members Table (Allocation of Requests into Pools)
CREATE TABLE pool_members (
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

CREATE INDEX idx_pool_members_pool ON pool_members(pool_id);
CREATE INDEX idx_pool_members_passenger ON pool_members(passenger_id);

-- 8. Ride Status History Table (Immutable Audit Ledger)
CREATE TABLE ride_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_request_id UUID REFERENCES ride_requests(id) ON DELETE CASCADE,
    pool_id UUID REFERENCES pools(id) ON DELETE CASCADE,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reason_or_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_history_request ON ride_status_history(ride_request_id);
CREATE INDEX idx_status_history_pool ON ride_status_history(pool_id);
CREATE INDEX idx_status_history_created ON ride_status_history(created_at);

-- 9. Fares Table (Dynamic Pricing & Pooling Discount)
CREATE TABLE fares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_request_id UUID NOT NULL UNIQUE REFERENCES ride_requests(id) ON DELETE RESTRICT,
    pool_id UUID NOT NULL REFERENCES pools(id) ON DELETE RESTRICT,
    base_fare NUMERIC(10,2) NOT NULL DEFAULT 150.00,
    distance_km NUMERIC(6,2) NOT NULL,
    per_km_rate NUMERIC(6,2) NOT NULL DEFAULT 45.00,
    pool_discount_pct NUMERIC(4,2) NOT NULL DEFAULT 30.00 CHECK (pool_discount_pct BETWEEN 0.00 AND 60.00),
    final_fare NUMERIC(10,2) NOT NULL CHECK (final_fare >= 0.00),
    currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fares_pool_id ON fares(pool_id);

-- 10. Payments Table (bKash, Nagad, Card, Cash)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_request_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE RESTRICT,
    passenger_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    fare_id UUID NOT NULL REFERENCES fares(id) ON DELETE RESTRICT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0.00),
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('BKASH', 'NAGAD', 'CARD', 'CASH')),
    transaction_id VARCHAR(100) UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_ride_request ON payments(ride_request_id);
CREATE INDEX idx_payments_status ON payments(status);

-- 11. Ratings Table (Post-trip evaluation)
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
    ride_request_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
    rater_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    ratee_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    rating_score INT NOT NULL CHECK (rating_score BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ratings_ratee ON ratings(ratee_user_id);
`;

export const DOCKER_COMPOSE_YML = `# =========================================================================
# DHAKA TESLA POOL MVP - DOCKER COMPOSE SPECIFICATION
# Services: db (PostgreSQL 16), api (Node.js/Express :4000), web (React/Vite :5173)
# Single command launch: docker compose up --build
# =========================================================================

version: '3.8'

services:
  # -----------------------------------------------------------------------
  # 1. Database Service (PostgreSQL 16) with Named Volume & Healthcheck
  # -----------------------------------------------------------------------
  db:
    image: postgres:16-alpine
    container_name: dhaka_pool_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: \${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-postgres_dev_password}
      POSTGRES_DB: \${POSTGRES_DB:-dhaka_tesla_pool}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER:-postgres} -d \${POSTGRES_DB:-dhaka_tesla_pool}"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 5s
    networks:
      - app_network

  # -----------------------------------------------------------------------
  # 2. Backend API Service (Node.js / Express, Port 4000) with /health check
  # -----------------------------------------------------------------------
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: dhaka_pool_api
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      NODE_ENV: development
      PORT: \${PORT:-4000}
      DATABASE_URL: \${DATABASE_URL:-postgres://postgres:postgres_dev_password@db:5432/dhaka_tesla_pool}
      JWT_SECRET: \${JWT_SECRET:-dev_jwt_secret_change_in_production_32chars}
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:4000/health || curl -f http://localhost:4000/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    volumes:
      - ./backend:/app
      - /app/node_modules
    networks:
      - app_network

  # -----------------------------------------------------------------------
  # 3. Frontend Web Service (React / Vite Dev Server, Port 5173)
  # -----------------------------------------------------------------------
  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: dhaka_pool_web
    restart: unless-stopped
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:4000
    depends_on:
      api:
        condition: service_healthy
    volumes:
      - ./frontend:/app
      - /app/node_modules
    networks:
      - app_network

# -------------------------------------------------------------------------
# Persistent Named Volumes
# -------------------------------------------------------------------------
volumes:
  postgres_data:
    driver: local

# -------------------------------------------------------------------------
# Bridge Network
# -------------------------------------------------------------------------
networks:
  app_network:
    driver: bridge
`;

export const ENV_EXAMPLE = `# =============================================================================
# ENVIRONMENT CONFIGURATION EXAMPLE (.env.example)
# Copy this file to .env before starting the Docker Compose cluster:
#   cp .env.example .env
# =============================================================================

# Server Port (Node.js API)
PORT=4000

# PostgreSQL Connection String (uses 'db' service name within Docker network)
DATABASE_URL=postgres://postgres:postgres_dev_password@db:5432/dhaka_tesla_pool

# JWT Secret for Session & Token Authentication (min 32 characters for production)
JWT_SECRET=your_jwt_secret_min_32_characters_here

# PostgreSQL Database Service Credentials (used by 'db' service)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_dev_password
POSTGRES_DB=dhaka_tesla_pool

# Frontend Vite Client Configuration
VITE_API_URL=http://localhost:4000
`;

export const CONCURRENCY_SQL_SNIPPET = `-- =========================================================================
-- CONCURRENCY SAFEGUARD: PREVENTING OVERBOOKING IN TESLA POOLS
-- Uses PostgreSQL Row-Level Lock: SELECT ... FOR UPDATE
-- =========================================================================

BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- 1. Lock the target pool row exclusively to prevent race conditions
SELECT id, available_seats, max_seats, status 
FROM pools 
WHERE id = 'a3bb189e-8bf9-4888-9912-110022334455' 
  AND status = 'FORMING' 
FOR UPDATE;

-- 2. Verify seat availability inside locked transaction
-- If available_seats < requested_seats (e.g. 2 < 1), RAISE EXCEPTION:
-- "Seat capacity exceeded: Tesla Model 3 has only %s seats remaining"

-- 3. Insert pool membership record
INSERT INTO pool_members (
    pool_id, 
    ride_request_id, 
    passenger_id, 
    seats_reserved, 
    pickup_order, 
    dropoff_order, 
    member_status
) VALUES (
    'a3bb189e-8bf9-4888-9912-110022334455',
    'f1234567-89ab-cdef-0123-456789abcdef',
    'u7777777-8888-9999-aaaa-bbbbccccdddd',
    1, -- requested seats
    2, -- pickup sequence
    2, -- dropoff sequence
    'BOOKED'
);

-- 4. Decrement available seats atomically
UPDATE pools 
SET available_seats = available_seats - 1,
    status = CASE WHEN available_seats - 1 = 0 THEN 'DISPATCHED' ELSE 'FORMING' END
WHERE id = 'a3bb189e-8bf9-4888-9912-110022334455';

-- 5. Update ride_request to MATCHED status
UPDATE ride_requests 
SET status = 'MATCHED', pool_id = 'a3bb189e-8bf9-4888-9912-110022334455'
WHERE id = 'f1234567-89ab-cdef-0123-456789abcdef';

-- 6. Log immutable audit trail
INSERT INTO ride_status_history (
    ride_request_id, pool_id, old_status, new_status, reason_or_notes
) VALUES (
    'f1234567-89ab-cdef-0123-456789abcdef',
    'a3bb189e-8bf9-4888-9912-110022334455',
    'PENDING',
    'MATCHED',
    'Matched to Tesla Model 3 pool along Uttara-Airport-Gulshan corridor'
);

COMMIT;
`;
