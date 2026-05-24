import { z } from 'zod';

export const RegisterUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain digit')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number').optional(),
  role: z.enum(['CLIENT']).default('CLIENT'),
});

export type RegisterUserDto = z.infer<typeof RegisterUserSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().default(false),
});

export type LoginDto = z.infer<typeof LoginSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/),
});

export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().uuid(),
  newPassword: z.string().min(8).max(128),
});

export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

export const UpdateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{7,14}$/).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

export const ChangeRoleSchema = z.object({
  userId: z.string().uuid(),
  newRole: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RECEPTIONIST', 'COSMETOLOGIST', 'MASSAGIST', 'CLIENT']),
});

export type ChangeRoleDto = z.infer<typeof ChangeRoleSchema>;
