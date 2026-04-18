import { z } from 'zod';

export const createContactSchema = z.object({
  caseId: z.string().uuid('caseId debe ser un UUID válido'),
  message: z.string().max(500).optional(),
});

export const listContactsSchema = z.object({
  role: z.enum(['initiator', 'responder']).optional(),
  status: z.enum(['pending', 'active', 'completed', 'rejected']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const updateContactSchema = z.object({
  status: z.enum(['active', 'rejected', 'completed']),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type ListContactsQuery = z.infer<typeof listContactsSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
