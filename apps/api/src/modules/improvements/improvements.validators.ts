import { z } from 'zod';

// route y userAgent los adjunta el cliente solo: se truncan en vez de rechazarse para que
// una URL larga nunca haga perder la nota que el admin sí escribió a mano.
export const createImprovementSchema = z.object({
  note: z.string().trim().min(1).max(2000),
  route: z.string().trim().transform((s) => s.slice(0, 255)).optional(),
  userAgent: z.string().trim().transform((s) => s.slice(0, 500)).optional(),
});

export type CreateImprovementInput = z.infer<typeof createImprovementSchema>;
