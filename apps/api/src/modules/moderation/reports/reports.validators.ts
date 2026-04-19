import { z } from 'zod';

export const createReportSchema = z.object({
  reason: z.enum(['spam', 'contenido_inapropiado', 'falso', 'acoso', 'otro']),
  description: z.string().max(1000).optional(),
});

export const listReportsSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'dismissed', 'actioned']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const updateReportSchema = z.object({
  status: z.enum(['reviewed', 'dismissed', 'actioned']),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ListReportsQuery = z.infer<typeof listReportsSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
