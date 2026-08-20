import { z } from 'zod';

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const animalSexSchema = z.enum(['macho', 'hembra', 'desconocido']);
const animalSizeSchema = z.enum(['chico', 'mediano', 'grande']);
const animalColorSchema = z.enum(['negro', 'blanco', 'marron', 'gris', 'dorado', 'manchado', 'tricolor']);

const animalConditionSchema = z.enum([
  'herido', 'sano', 'asustado', 'debil', 'no_pude_acercarme',
]);

const whereaboutsSchema = z.enum([
  'en_la_calle', 'con_quien_publica', 'con_un_tercero', 'desconocido',
]);

const listingTypeSchema = z.enum(['found', 'lost']);

const animalTypeSchema = z.enum(['perro', 'gato', 'caballo', 'vaca', 'ave', 'otro']);

// Cuando el usuario dice que vio al animal. Los chips del wizard resuelven
// contra el reloj del cliente, asi que las cotas son la unica defensa contra un
// dispositivo con la hora mal: un minuto de tolerancia hacia adelante para el
// desfasaje normal, un ano hacia atras.
const seenAtSchema = z.coerce
  .date()
  .refine((d) => d.getTime() <= Date.now() + 60_000, {
    message: 'La fecha no puede estar en el futuro',
  })
  .refine((d) => d.getTime() >= Date.now() - 365 * 24 * 3600 * 1000, {
    message: 'La fecha no puede ser de hace mas de un ano',
  });

export const createCaseSchema = z.object({
  listingType: listingTypeSchema.default('found'),
  title: z.string().trim().min(3).max(120),
  animalType: animalTypeSchema,
  description: z.string().trim().min(10).max(2000),
  location: locationSchema,
  locationText: z.string().trim().max(255).optional(),
  referenceNote: z.string().trim().max(255).optional(),
  animalCondition: animalConditionSchema.optional(),
  seenAt: seenAtSchema.optional(),
  urgencyLevel: z.number().int().min(1).max(5).default(1),
  phoneContact: z.string().trim().max(20).optional(),
  imageIds: z.array(z.string().max(500)).max(10).optional(),
  animalSex: animalSexSchema.optional(),
  animalSize: animalSizeSchema.optional(),
  animalColor: animalColorSchema.optional(),
  whereabouts: whereaboutsSchema.default('en_la_calle'),
  hostName: z.string().trim().max(120).optional(),
});

export const listCasesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(0.1).max(100).default(10),
  status: z
    .enum(['abierto', 'en_rescate', 'resuelto', 'inactivo', 'spam'])
    .optional(), // 'archivado' omitido a propósito — no expuesto en búsqueda pública
  animalType: animalTypeSchema.optional(),
  listingType: listingTypeSchema.optional(),
  urgencyMin: z.coerce.number().int().min(1).max(5).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(['recent', 'urgency', 'distance']).default('recent'),
  animalSex: animalSexSchema.optional(),
  animalSize: animalSizeSchema.optional(),
  animalColor: animalColorSchema.optional(),
  // Sin valor no filtra nada. El mapa manda sheltered=false para esconder los
  // que ya estan a resguardo; ese es su unico uso hoy.
  sheltered: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

// Schema geografico compartido entre endpoints que resuelven sobre el mismo
// ST_DWithin: GET /nearby (lista casos) y GET /zone-stats (metricas).
// El acoplamiento es deliberado — ambos endpoints replican el contrato de punto + radio.
const geographicQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.1).max(100).default(10),
});

export const nearbyCasesSchema = geographicQuerySchema;

export const zoneStatsSchema = geographicQuerySchema;

export const updateCaseSchema = z
  .object({
    title: z.string().trim().min(3).max(120).optional(),
    status: z.enum(['abierto', 'en_rescate', 'resuelto', 'inactivo', 'spam', 'archivado']).optional(),
    resolutionType: z
      .enum(['adoptado', 'en_transito', 'zoonosis', 'derivado_ong', 'fallecio', 'sin_paradero', 'otro'])
      .optional(),
    animalType: animalTypeSchema.optional(),
    animalCondition: animalConditionSchema.optional(),
    urgencyLevel: z.number().int().min(1).max(5).optional(),
    description: z.string().trim().min(10).max(2000).optional(),
    phoneContact: z.string().trim().max(20).optional(),
    locationText: z.string().trim().max(255).optional(),
  referenceNote: z.string().trim().max(255).optional(),
    animalSex: animalSexSchema.optional(),
    animalSize: animalSizeSchema.optional(),
    animalColor: animalColorSchema.optional(),
    whereabouts: whereaboutsSchema.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'Al menos un campo es requerido',
  });

export const addUpdateSchema = z
  .object({
    // Espejo del CHECK case_updates_type_check. Sumar un valor aca sin la migration
    // correspondiente hace que el insert rebote contra el constraint.
    // Ver 20260814100000-update-case-update-types.js.
    updateType: z.enum([
      'status_change', 'comment', 'photo_added', 'reactivated',
      'avistamiento', 'alojamiento', 'salud', 'veterinario', 'comentario',
    ]),
    content: z.string().trim().max(1000).optional(),
    hostName: z.string().trim().min(1).max(100).optional(),
  })
  // hostName solo tiene sentido en 'alojamiento'. Si se aceptara en cualquier tipo
  // quedarian filas con un dato que ninguna pantalla muestra, imposibles de explicar
  // despues. Mejor rebotar que guardar en silencio.
  .superRefine((data, ctx) => {
    if (data.hostName !== undefined && data.updateType !== 'alojamiento') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hostName'],
        message: 'Solo se puede indicar quién aloja en una novedad de alojamiento',
      });
    }
  });

export const feedCasesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.1).max(100).default(10),
  listingType: listingTypeSchema.optional(),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;
export type ListCasesQuery = z.infer<typeof listCasesSchema>;
export type NearbyCasesQuery = z.infer<typeof nearbyCasesSchema>;
export type FeedCasesQuery = z.infer<typeof feedCasesSchema>;
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;
export type AddUpdateInput = z.infer<typeof addUpdateSchema>;
