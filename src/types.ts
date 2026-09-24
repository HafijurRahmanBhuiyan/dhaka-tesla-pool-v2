export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPrimary?: boolean;
  isForeign?: boolean;
  references?: string;
  defaultVal?: string;
  constraints?: string;
  description: string;
}

export interface TableIndex {
  name: string;
  type: 'BTREE' | 'GIST' | 'HASH' | 'UNIQUE';
  columns: string[];
  purpose: string;
}

export interface SchemaTable {
  id: string;
  name: string;
  category: 'core' | 'ride' | 'billing' | 'audit';
  description: string;
  columns: TableColumn[];
  indexes: TableIndex[];
  constraints: string[];
}

export interface RelationshipExplanation {
  source: string;
  target: string;
  type: 'One-to-One' | 'One-to-Many' | 'Many-to-Many';
  foreignKey: string;
  explanation: string;
  businessRule: string;
}

export interface SimulatedRideRequest {
  id: string;
  passengerName: string;
  phone: string;
  pickupName: string;
  dropoffName: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  requestedSeats: number;
  status: 'PENDING' | 'MATCHED' | 'BOARDED' | 'COMPLETED' | 'CANCELLED';
  fareBDT: number;
  poolId?: string;
}

export interface SimulatedPool {
  id: string;
  driverName: string;
  teslaModel: string;
  licensePlate: string;
  totalCapacity: number;
  reservedSeats: number;
  status: 'FORMING' | 'DISPATCHED' | 'IN_PROGRESS' | 'COMPLETED';
  currentLocation: string;
  members: Array<{
    requestId: string;
    passengerName: string;
    seats: number;
    pickup: string;
    dropoff: string;
    status: string;
  }>;
}
