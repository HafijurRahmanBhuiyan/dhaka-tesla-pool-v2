import { z } from 'zod';

export type UserRole = 'passenger' | 'driver' | 'admin';

export interface Vehicle {
  id?: string;
  make: string;
  model: string;
  year?: number;
  color?: string;
  license_plate: string;
  total_seat_capacity: number;
  battery_level_pct?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}

export interface User {
  id: string;
  email: string;
  phone: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  rating_avg: number;
  is_active: boolean;
  vehicle?: Vehicle;
  created_at: string;
  updated_at: string;
}

export type SafeUser = Omit<User, 'password_hash'>;

// Bangladeshi phone regex: +8801XXXXXXXXX or 01XXXXXXXXX
const BD_PHONE_REGEX = /^(?:\+?880|0)?1[3-9]\d{8}$/;

export const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Invalid email address')
      .toLowerCase()
      .trim(),
    phone: z
      .string()
      .min(1, 'Phone number is required')
      .regex(BD_PHONE_REGEX, 'Must be a valid Bangladeshi mobile number (e.g., +8801712345678 or 01712345678)')
      .trim(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    full_name: z
      .string()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name cannot exceed 100 characters')
      .trim(),
    role: z.enum(['passenger', 'driver'] as const),
    vehicle: z
      .object({
        make: z.string().default('Tesla'),
        model: z.enum(['Model 3', 'Model Y', 'Model S', 'Model X'] as const),
        license_plate: z
          .string()
          .min(4, 'License plate must be at least 4 characters')
          .trim(),
        total_seat_capacity: z.number().int().min(1).max(7).default(4)
      })
      .optional()
  })
  .refine(
    (data) => {
      // If role is driver, vehicle information is required
      if (data.role === 'driver' && !data.vehicle) {
        return false;
      }
      return true;
    },
    {
      message: 'Vehicle details (model, license_plate) are required for driver registration',
      path: ['vehicle']
    }
  );

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required')
});

export type LoginInput = z.infer<typeof loginSchema>;

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  iat?: number;
  exp?: number;
}
