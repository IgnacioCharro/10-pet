import { z } from 'zod';
import { USER_ROLES } from './admin.roles';

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
});

// Union discriminado: `role` es obligatorio cuando y solo cuando la accion es
// set_role. Con un objeto plano y `role` opcional, un set_role sin rol pasaria la
// validacion y reventaria mas abajo.
export const patchAdminUserSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('ban') }),
  z.object({ action: z.literal('unban') }),
  z.object({ action: z.literal('set_role'), role: z.enum(USER_ROLES) }),
]);

export const patchAdminCaseSchema = z.object({
  action: z.enum(['delete', 'restore', 'archive']),
});

export const listAdminCasesSchema = z.object({
  status: z.enum(['archivado', 'eliminado']).default('archivado'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListUsersQuery = z.infer<typeof listUsersSchema>;
export type PatchAdminUserInput = z.infer<typeof patchAdminUserSchema>;
export type PatchAdminCaseInput = z.infer<typeof patchAdminCaseSchema>;
export type ListAdminCasesQuery = z.infer<typeof listAdminCasesSchema>;
