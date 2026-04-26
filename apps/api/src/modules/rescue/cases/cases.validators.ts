import { z } from 'zod';

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const createCaseSchema = z.object({
  animalType: z.enum(['perro', 'gato', 'otro']),
  description: z.string().trim().min(10).max(2000),
  location: locationSchema,
  locationText: z.string().trim().max(255).optional(),
  condition: z.string().trim().max(100).optional(),
  urgencyLevel: z.number().int().min(1).max(5).default(1),
  phoneContact: z.string().trim().max(20).optional(),
  imageIds: z.array(z.string().max(500)).max(10).optional(),
});

export const listCasesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(0.1).max(100).default(10),
  status: z
    .enum(['abierto', 'en_rescate', 'resuelto', 'inactivo', 'spam'])
    .optional(),
  animalType: z.enum(['perro', 'gato', 'otro']).optional(),
  urgencyMin: z.coerce.number().int().min(1).max(5).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(['recent', 'urgency', 'distance']).default('recent'),
});

export const nearbyCasesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.1).max(100).default(10),
});

export const updateCaseSchema = z
  .object({
    status: z.enum(['abierto', 'en_rescate', 'resuelto', 'inactivo', 'spam']).optional(),
    resolutionType: z
      .enum(['rescatado', 'adoptado', 'fallecido', 'sin_novedad'])
      .optional(),
    urgencyLevel: z.number().int().min(1).max(5).optional(),
    description: z.string().trim().min(10).max(2000).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'Al menos un campo es requerido',
  });

export const addUpdateSchema = z.object({
  updateType: z.enum([
    'status_change', 'comment', 'photo_added', 'reactivated',
    'avistamiento', 'medicacion', 'veterinario', 'comentario',
  ]),
  content: z.string().trim().max(1000).optional(),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type ListCasesQuery = z.infer<typeof listCasesSchema>;
export type NearbyCasesQuery = z.infer<typeof nearbyCasesSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
export type AddUpdateInput = z.infer<typeof addUpdateSchema>;
