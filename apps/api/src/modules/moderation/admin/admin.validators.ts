import { z } from 'zod';

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
});

export const patchAdminUserSchema = z.object({
  action: z.enum(['ban', 'unban']),
});

export const patchAdminCaseSchema = z.object({
  action: z.enum(['delete', 'restore']),
});

export type ListUsersQuery = z.infer<typeof listUsersSchema>;
export type PatchAdminUserInput = z.infer<typeof patchAdminUserSchema>;
export type PatchAdminCaseInput = z.infer<typeof patchAdminCaseSchema>;
