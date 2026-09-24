import { z } from 'zod';

export type RideStatus =
  | 'REQUESTED'
  | 'MATCHED'
  | 'ACCEPTED'
  | 'DRIVER_ARRIVED'
  | 'STARTED'
  | 'COMPLETED'
  | 'CANCELLED';

export type PoolStatus =
  | 'FORMING'
  | 'MATCHED'
  | 'DISPATCHED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export const ALLOWED_RIDE_TRANSITIONS: Record<RideStatus, readonly RideStatus[]> = {
  REQUESTED: ['MATCHED', 'ACCEPTED', 'CANCELLED'],
  MATCHED: ['ACCEPTED', 'DRIVER_ARRIVED', 'CANCELLED'],
  ACCEPTED: ['DRIVER_ARRIVED', 'CANCELLED'],
  DRIVER_ARRIVED: ['STARTED', 'CANCELLED'],
  STARTED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
} as const;

export interface DhakaZone {
  id: string;
  name: string;
  cluster: 'NORTH' | 'CENTRAL' | 'SOUTH';
  lat: number;
  lng: number;
}

export const DHAKA_ZONES: Record<string, DhakaZone> = {
  UTTARA: { id: 'UTTARA', name: 'Uttara Sector 3/11', cluster: 'NORTH', lat: 23.8759, lng: 90.3795 },
  AIRPORT: { id: 'AIRPORT', name: 'Hazrat Shahjalal Airport', cluster: 'NORTH', lat: 23.8433, lng: 90.4042 },
  BANANI: { id: 'BANANI', name: 'Banani Road 11', cluster: 'NORTH', lat: 23.7937, lng: 90.4046 },
  GULSHAN2: { id: 'GULSHAN2', name: 'Gulshan-2 Circle', cluster: 'NORTH', lat: 23.7925, lng: 90.4155 },
  GULSHAN1: { id: 'GULSHAN1', name: 'Gulshan-1 Circle', cluster: 'NORTH', lat: 23.7785, lng: 90.4172 },
  MOHAKHALI: { id: 'MOHAKHALI', name: 'Mohakhali Flyover', cluster: 'CENTRAL', lat: 23.7778, lng: 90.4035 },
  TEJGAON: { id: 'TEJGAON', name: 'Tejgaon Industrial Area', cluster: 'CENTRAL', lat: 23.7644, lng: 90.3987 },
  FARMGATE: { id: 'FARMGATE', name: 'Farmgate Bus Terminal', cluster: 'CENTRAL', lat: 23.7561, lng: 90.3872 },
  KAWRANBAZAR: { id: 'KAWRANBAZAR', name: 'Kawran Bazar SAARC', cluster: 'CENTRAL', lat: 23.7511, lng: 90.3934 },
  SHAHBAGH: { id: 'SHAHBAGH', name: 'Shahbagh Intersection', cluster: 'SOUTH', lat: 23.7383, lng: 90.3957 },
  MOTIJHEEL: { id: 'MOTIJHEEL', name: 'Motijheel Shapla Chattar', cluster: 'SOUTH', lat: 23.7275, lng: 90.4194 }
};

export interface RideRequest {
  id: string;
  passenger_id: string;
  passenger_name: string;
  pickup_zone: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_zone: string;
  dropoff_lat: number;
  dropoff_lng: number;
  requested_seats: number;
  status: RideStatus;
  pool_id?: string;
  fare_bdt: number;
  created_at: string;
  updated_at: string;
}

export interface PoolMember {
  id: string;
  pool_id: string;
  ride_request_id: string;
  passenger_id: string;
  passenger_name: string;
  seats_reserved: number;
  pickup_zone: string;
  dropoff_zone: string;
  pickup_order: number;
  dropoff_order: number;
  member_status: 'BOOKED' | 'BOARDED' | 'DROPPED_OFF' | 'CANCELLED';
  joined_at: string;
}

export interface Pool {
  id: string;
  driver_id: string;
  driver_name: string;
  vehicle_id: string;
  vehicle_model: string;
  license_plate: string;
  seat_capacity: number; // e.g. 4 for Tesla Model 3
  available_seats: number;
  status: PoolStatus;
  corridor_name: string;
  origin_zone: string;
  destination_zone: string;
  route_direction: 'SOUTHBOUND' | 'NORTHBOUND' | 'CIRCULAR';
  members: PoolMember[];
  created_at: string;
  updated_at: string;
}

export interface StatusAuditEntry {
  id: string;
  ride_request_id: string;
  old_status: RideStatus;
  new_status: RideStatus;
  actor_id: string;
  actor_role: string;
  reason?: string;
  timestamp: string;
}

export const createRideSchema = z.object({
  pickup_zone: z.string().min(1, 'Pickup zone is required'),
  dropoff_zone: z.string().min(1, 'Dropoff zone is required'),
  requested_seats: z.number().int().min(1).max(4).default(1)
});

export const transitionRideSchema = z.object({
  target_status: z.enum([
    'REQUESTED',
    'MATCHED',
    'ACCEPTED',
    'DRIVER_ARRIVED',
    'STARTED',
    'COMPLETED',
    'CANCELLED'
  ] as const),
  reason: z.string().optional()
});

export const matchRideSchema = z.object({
  pool_id: z.string().optional() // Optional: manual target pool or automatic algorithm selection
});
