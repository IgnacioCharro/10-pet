import { z } from 'zod';

export const createVetAssistanceSchema = z
  .object({
    procedure: z.string().trim().max(500).optional(),
    medication: z.string().trim().max(500).optional(),
    attendedAt: z.string().datetime({ offset: true }).optional(),
  })
  .refine((d) => d.procedure || d.medication, {
    message: 'Al menos procedimiento o medicacion son requeridos',
  });

export type CreateVetAssistanceInput = z.infer<typeof createVetAssistanceSchema>;
