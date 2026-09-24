import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userService } from './user.service';
import { SignupInput, LoginInput, SafeUser, JwtPayload } from '../models/user.model';
import { AppError } from '../models/response.model';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_32chars';
const JWT_EXPIRES_IN = '7d';

class AuthService {
  public async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public generateToken(user: SafeUser): string {
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });
  }

  public async signup(input: SignupInput): Promise<{ user: SafeUser; token: string }> {
    // 1. Check if email already exists
    const existingEmail = await userService.findByEmail(input.email);
    if (existingEmail) {
      throw new AppError(
        409,
        'EMAIL_EXISTS',
        `An account with email '${input.email}' already exists. Please login instead.`,
        { field: 'email' }
      );
    }

    // 2. Check if phone already exists
    const existingPhone = await userService.findByPhone(input.phone);
    if (existingPhone) {
      throw new AppError(
        409,
        'PHONE_EXISTS',
        `An account with phone number '${input.phone}' is already registered.`,
        { field: 'phone' }
      );
    }

    // 3. Hash password using bcrypt
    const password_hash = await this.hashPassword(input.password);

    // 4. Create new user record
    const id = `usr-${input.role.substring(0, 4)}-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const newUser = await userService.createUser({
      id,
      email: input.email.toLowerCase(),
      phone: input.phone,
      password_hash,
      full_name: input.full_name,
      role: input.role,
      rating_avg: 5.0,
      is_active: true,
      vehicle: input.role === 'driver' && input.vehicle ? {
        id: `veh-${Date.now().toString(36)}`,
        make: input.vehicle.make || 'Tesla',
        model: input.vehicle.model,
        license_plate: input.vehicle.license_plate,
        total_seat_capacity: input.vehicle.total_seat_capacity || 4,
        battery_level_pct: 100,
        status: 'ACTIVE'
      } : undefined,
      created_at: now,
      updated_at: now
    });

    const safeUser = userService.toSafeUser(newUser);
    const token = this.generateToken(safeUser);

    return { user: safeUser, token };
  }

  public async login(input: LoginInput): Promise<{ user: SafeUser; token: string }> {
    // 1. Look up user by email
    const user = await userService.findByEmail(input.email);
    if (!user) {
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'Invalid email or password combination.',
        { field: 'email' }
      );
    }

    // 2. Check if account is active
    if (!user.is_active) {
      throw new AppError(
        403,
        'ACCOUNT_SUSPENDED',
        'Your Dhaka Tesla Pool account has been deactivated. Please contact support.'
      );
    }

    // 3. Verify password hash using bcrypt
    const isPasswordValid = await this.verifyPassword(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'Invalid email or password combination.',
        { field: 'password' }
      );
    }

    const safeUser = userService.toSafeUser(user);
    const token = this.generateToken(safeUser);

    return { user: safeUser, token };
  }

  public async getCurrentUser(userId: string): Promise<SafeUser> {
    const user = await userService.findById(userId);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User profile not found.');
    }
    return userService.toSafeUser(user);
  }
}

export const authService = new AuthService();
