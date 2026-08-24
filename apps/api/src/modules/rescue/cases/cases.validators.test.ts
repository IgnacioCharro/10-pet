import { describe, it, expect } from 'vitest';
import { createCaseSchema, updateCaseSchema, listCasesSchema, addUpdateSchema } from './cases.validators';

const baseCase = {
  title: 'Perro mediano, herido',
  animalType: 'perro',
  description: 'Perro herido en la calle sin collar',
  location: { lat: -34.6037, lng: -58.3816 },
};

describe('createCaseSchema — titulo', () => {
  it('exige titulo', () => {
    const sinTitulo: Record<string, unknown> = { ...baseCase };
    delete sinTitulo['title'];
    expect(createCaseSchema.safeParse(sinTitulo).success).toBe(false);
  });

  it('rechaza un titulo de menos de 3 caracteres', () => {
    expect(createCaseSchema.safeParse({ ...baseCase, title: 'ab' }).success).toBe(false);
  });

  it('rechaza un titulo de mas de 120 caracteres', () => {
    expect(createCaseSchema.safeParse({ ...baseCase, title: 'x'.repeat(121) }).success).toBe(false);
  });
});

describe('createCaseSchema — seenAt', () => {
  it('acepta una fecha reciente', () => {
    const ayer = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const parsed = createCaseSchema.safeParse({ ...baseCase, seenAt: ayer });
    expect(parsed.success).toBe(true);
  });

  it('rechaza una fecha futura', () => {
    const manana = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    expect(createCaseSchema.safeParse({ ...baseCase, seenAt: manana }).success).toBe(false);
  });

  it('rechaza una fecha de hace mas de un ano', () => {
    const viejo = new Date(Date.now() - 400 * 24 * 3600 * 1000).toISOString();
    expect(createCaseSchema.safeParse({ ...baseCase, seenAt: viejo }).success).toBe(false);
  });
});

describe('createCaseSchema — valores nuevos', () => {
  it('rechaza at_risk, que se retiro como tipo de publicacion', () => {
    const parsed = createCaseSchema.safeParse({ ...baseCase, listingType: 'at_risk' });
    expect(parsed.success).toBe(false);
  });

  it('acepta la especie ave', () => {
    expect(createCaseSchema.safeParse({ ...baseCase, animalType: 'ave' }).success).toBe(true);
  });

  it('acepta los cinco estados del animal', () => {
    for (const estado of ['herido', 'sano', 'asustado', 'debil', 'no_pude_acercarme']) {
      expect(createCaseSchema.safeParse({ ...baseCase, animalCondition: estado }).success).toBe(true);
    }
  });

  it('rechaza un estado que no esta en el enum', () => {
    expect(createCaseSchema.safeParse({ ...baseCase, animalCondition: 'muerto' }).success).toBe(false);
  });
});

describe('createCaseSchema — condition retirado', () => {
  // Zod descarta las claves desconocidas en silencio; no las rechaza.
  // Lo que importa es que no lleguen al servicio.
  it('descarta condition sin fallar', () => {
    const parsed = createCaseSchema.safeParse({ ...baseCase, condition: 'herido' });
    expect(parsed.success).toBe(true);
    expect(parsed.success && 'condition' in parsed.data).toBe(false);
  });
});

describe('updateCaseSchema', () => {
  it('acepta editar el titulo', () => {
    expect(updateCaseSchema.safeParse({ title: 'Otro titulo' }).success).toBe(true);
  });

  it('acepta editar el estado del animal', () => {
    expect(updateCaseSchema.safeParse({ animalCondition: 'sano' }).success).toBe(true);
  });
});

describe('listCasesSchema', () => {
  it('rechaza at_risk, que se retiro como tipo de publicacion', () => {
    const parsed = listCasesSchema.safeParse({ listingType: 'at_risk' });
    expect(parsed.success).toBe(false);
  });
});

describe('createCaseSchema — whereabouts', () => {
  it('acepta whereabouts y hostName al crear', () => {
    const parsed = createCaseSchema.safeParse({
      ...baseCase,
      whereabouts: 'con_un_tercero',
      hostName: 'Marta Gimenez',
    });
    expect(parsed.success).toBe(true);
  });

  it('por defecto un caso nuevo queda en la calle', () => {
    const parsed = createCaseSchema.safeParse(baseCase);
    expect(parsed.success && parsed.data.whereabouts).toBe('en_la_calle');
  });

  it('rechaza un whereabouts que no existe', () => {
    const parsed = createCaseSchema.safeParse({ ...baseCase, whereabouts: 'en_el_veterinario' });
    expect(parsed.success).toBe(false);
  });

  it('listCases acepta el filtro sheltered', () => {
    const parsed = listCasesSchema.safeParse({ sheltered: 'false' });
    expect(parsed.success && parsed.data.sheltered).toBe(false);
  });
});

describe('addUpdateSchema — el paradero lo mueve la novedad de alojamiento', () => {
  it('acepta whereabouts en una novedad de alojamiento', () => {
    const parsed = addUpdateSchema.safeParse({
      updateType: 'alojamiento',
      content: 'Aparecio, lo tiene la vecina',
      hostName: 'Marta Gimenez',
      whereabouts: 'con_un_tercero',
    });
    expect(parsed.success).toBe(true);
  });

  it('rechaza whereabouts en cualquier otro tipo', () => {
    const parsed = addUpdateSchema.safeParse({
      updateType: 'avistamiento',
      content: 'Lo vi cerca de la plaza',
      whereabouts: 'con_quien_publica',
    });
    expect(parsed.success).toBe(false);
  });

  it('rechaza desconocido: no se puede cambiar de lugar hacia ningun lado', () => {
    const parsed = addUpdateSchema.safeParse({
      updateType: 'alojamiento',
      whereabouts: 'desconocido',
    });
    expect(parsed.success).toBe(false);
  });

  it('sigue rechazando hostName fuera de alojamiento', () => {
    const parsed = addUpdateSchema.safeParse({
      updateType: 'salud',
      content: 'Come bien',
      hostName: 'Marta Gimenez',
    });
    expect(parsed.success).toBe(false);
  });

  it('una novedad sin paradero sigue siendo valida', () => {
    const parsed = addUpdateSchema.safeParse({
      updateType: 'comentario',
      content: 'Sin novedades',
    });
    expect(parsed.success).toBe(true);
  });
});
