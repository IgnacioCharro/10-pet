import { z } from 'zod';

const emailField = z.string().trim().toLowerCase().pipe(z.string().email().max(255));

export const registerSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(8, 'La contrase\u00f1a debe tener al menos 8 caracteres')
    .max(128),
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1).max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
