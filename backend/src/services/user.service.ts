import bcrypt from 'bcryptjs';
import { User, SafeUser } from '../models/user.model';

class UserService {
  private users: Map<string, User> = new Map();
  private initialized = false;

  constructor() {
    this.seedDefaultUsers();
  }

  private async seedDefaultUsers() {
    if (this.initialized) return;
    this.initialized = true;

    const samplePasswordHash = await bcrypt.hash('Password123!', 10);

    // 1. Seed Sample Passenger
    const samplePassenger: User = {
      id: 'usr-pass-001',
      email: 'passenger@dhakatesla.com',
      phone: '+8801711000001',
      password_hash: samplePasswordHash,
      full_name: 'Tanvir Hossain',
      role: 'passenger',
      rating_avg: 4.95,
      is_active: true,
      created_at: new Date('2026-01-15T08:00:00Z').toISOString(),
      updated_at: new Date('2026-01-15T08:00:00Z').toISOString()
    };

    // 2. Seed Sample Tesla Driver (Mahmudul Hasan)
    const sampleDriver: User = {
      id: 'usr-driv-001',
      email: 'driver@dhakatesla.com',
      phone: '+8801811000002',
      password_hash: samplePasswordHash,
      full_name: 'Mahmudul Hasan (Tesla Captain)',
      role: 'driver',
      rating_avg: 4.98,
      is_active: true,
      vehicle: {
        id: 'veh-001',
        make: 'Tesla',
        model: 'Model 3',
        year: 2024,
        color: 'Pearl White Multi-Coat',
        license_plate: 'DHAKA-METRO-GA-11-9988',
        total_seat_capacity: 4,
        battery_level_pct: 88,
        status: 'ACTIVE'
      },
      created_at: new Date('2026-01-10T10:00:00Z').toISOString(),
      updated_at: new Date('2026-01-10T10:00:00Z').toISOString()
    };

    // 3. Seed Jashim Uddin (Driver of Tesla Model 3 "Bullet")
    const jashimDriver: User = {
      id: 'usr-driv-jashim',
      email: 'jashim@dhakatesla.com',
      phone: '+8801811000003',
      password_hash: samplePasswordHash,
      full_name: 'Jashim Uddin (Captain of "Bullet")',
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
        total_seat_capacity: 4,
        battery_level_pct: 92,
        status: 'ACTIVE'
      },
      created_at: new Date('2026-01-12T09:00:00Z').toISOString(),
      updated_at: new Date('2026-01-12T09:00:00Z').toISOString()
    };

    this.users.set(samplePassenger.email.toLowerCase(), samplePassenger);
    this.users.set(sampleDriver.email.toLowerCase(), sampleDriver);
    this.users.set(jashimDriver.email.toLowerCase(), jashimDriver);
  }

  public async findByEmail(email: string): Promise<User | null> {
    const user = this.users.get(email.toLowerCase());
    return user || null;
  }

  public async findByPhone(phone: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.phone === phone) {
        return user;
      }
    }
    return null;
  }

  public async findById(id: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.id === id) {
        return user;
      }
    }
    return null;
  }

  public async createUser(user: User): Promise<User> {
    this.users.set(user.email.toLowerCase(), user);
    return user;
  }

  public toSafeUser(user: User): SafeUser {
    const { password_hash, ...safe } = user;
    return safe;
  }

  public async listAllUsers(): Promise<SafeUser[]> {
    return Array.from(this.users.values()).map(this.toSafeUser);
  }
}

export const userService = new UserService();
