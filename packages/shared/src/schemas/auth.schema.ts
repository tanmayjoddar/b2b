import { z } from 'zod';
import { Role, UserStatus } from '../enums/index.js';

export const RegisterBrandSchema = z
  .object({
    email: z.string().email('Valid email is required').toLowerCase().trim(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password cannot exceed 100 characters'),
    companyName: z.string().min(2, 'Company name is required').max(100).trim(),
    gstNo: z
      .string()
      .regex(
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        'Invalid 15-character Indian GSTIN format',
      )
      .optional()
      .or(z.literal('')),
    website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  })
  .strict();

export type RegisterBrandDto = z.infer<typeof RegisterBrandSchema>;

export const LoginPasswordSchema = z
  .object({
    email: z.string().email('Valid email is required').toLowerCase().trim(),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export type LoginPasswordDto = z.infer<typeof LoginPasswordSchema>;

export const RequestOtpSchema = z
  .object({
    phone: z
      .string()
      .regex(/^\+91[6-9]\d{9}$/, 'Must be a valid Indian mobile number (+91XXXXXXXXXX)'),
  })
  .strict();

export type RequestOtpDto = z.infer<typeof RequestOtpSchema>;

export const VerifyOtpSchema = z
  .object({
    phone: z
      .string()
      .regex(/^\+91[6-9]\d{9}$/, 'Must be a valid Indian mobile number (+91XXXXXXXXXX)'),
    otp: z.string().length(6, 'OTP must be exactly 6 digits'),
  })
  .strict();

export type VerifyOtpDto = z.infer<typeof VerifyOtpSchema>;

export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  role: z.nativeEnum(Role),
  status: z.nativeEnum(UserStatus),
  brandId: z.string().nullable().optional(),
  factoryId: z.string().nullable().optional(),
});

export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthResponseSchema = z.object({
  user: AuthUserSchema,
  accessToken: z.string(),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
