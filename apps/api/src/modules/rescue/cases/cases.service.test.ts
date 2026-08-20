import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../db', () => ({
  sequelize: { query: vi.fn() },
  Case: { findByPk: vi.fn() },
  CaseImage: { bulkCreate: vi.fn(), findAll: vi.fn() },
  CaseUpdate: { create: vi.fn(), findAll: vi.fn() },
}));

vi.mock('../../../jobs/queue', () => ({
  notifyNewCaseQueue: null,
  contactRequestQueue: null,
}));

import { sequelize, CaseUpdate } from '../../../db';
import { listCases, getFeedCases, listCasesByUser, createCase, FEED_MAX_AGE_DAYS } from './cases.service';
import { VOLUNTEER_COUNT_SUBQUERY, FEED_VOLUNTEER_COUNT_EXPR } from './cases.ordering';
import { ListCasesQuery, FeedCasesQuery, CreateCaseInput } from './cases.validators';

const queryMock = vi.mocked(
  sequelize.query as unknown as (
    sql: string,
    options?: { replacements?: Record<string, unknown> },
  ) => Promise<unknown[]>,
);

// SQL emitido en la llamada n-esima a sequelize.query
const sqlOf = (call: number): string => String(queryMock.mock.calls[call]?.[0] ?? '');

// Los replacements de esa misma llamada, para chequear que los valores viajan
// parametrizados y no concatenados dentro del SQL
const replacementsOf = (call: number): Record<string, unknown> =>
  queryMock.mock.calls[call]?.[1]?.replacements ?? {};

// El SELECT lleva una subconsulta con su propio ORDER BY (heroUrl): el de la
// consulta es siempre el ultimo
const orderByOf = (sql: string): string =>
  sql.slice(sql.lastIndexOf('ORDER BY')).replace(/\s+/g, ' ').trim();

const baseListQuery: ListCasesQuery = { radius: 10, page: 1, limit: 20, sort: 'recent' };
const baseFeedQuery: FeedCasesQuery = { lat: -34.6037, lng: -58.3816, radius: 10 };

const baseCreateInput: CreateCaseInput = {
  listingType: 'found',
  title: 'Perrito encontrado en la plaza',
  animalType: 'perro',
  description: 'Encontrado cerca de la plaza central del pueblo, sin colgar',
  location: { lat: -34.6037, lng: -58.3816 },
  urgencyLevel: 1,
  whereabouts: 'en_la_calle',
};

beforeEach(() => {
  vi.clearAllMocks();
  // Fila generica: estos tests solo miran el SQL emitido, no lo que devuelve
  queryMock.mockResolvedValue([{ total: '0' }]);
});

describe('listCases — ORDER BY', () => {
  it('ordena por menos voluntarios dentro de cada nivel de gravedad', async () => {
    await listCases({ ...baseListQuery, sort: 'urgency' });

    expect(orderByOf(sqlOf(0))).toContain(`${VOLUNTEER_COUNT_SUBQUERY} ASC`);
  });

  it('no cuenta voluntarios cuando se ordena por recientes', async () => {
    await listCases({ ...baseListQuery, sort: 'recent' });

    expect(sqlOf(0)).not.toContain(VOLUNTEER_COUNT_SUBQUERY);
  });

  it('no agrega el recuento al SELECT ordenando por gravedad', async () => {
    await listCases({ ...baseListQuery, sort: 'urgency' });

    const sql = sqlOf(0);
    const selectClause = sql.slice(0, sql.indexOf('FROM cases c'));
    expect(selectClause).not.toContain('contacts');
  });
});

describe('listCasesByUser', () => {
  it('trae la foto de portada para que el dashboard la muestre', async () => {
    await listCasesByUser('user-1');

    expect(sqlOf(0)).toContain('"heroUrl"');
  });

  it('filtra por el dueno del caso', async () => {
    await listCasesByUser('user-1');

    expect(sqlOf(0)).toContain('c.user_id = :userId');
    expect(queryMock.mock.calls[0]?.[1]).toMatchObject({
      replacements: { userId: 'user-1' },
    });
  });

  it('no filtra por estado: el dueno ve tambien resueltos e inactivos', async () => {
    await listCasesByUser('user-1');

    // c.status aparece en el SELECT, asi que la unica lectura valida es el WHERE
    const sql = sqlOf(0);
    const whereClause = sql.slice(sql.indexOf('WHERE'), sql.indexOf('ORDER BY'));
    expect(whereClause).not.toContain('c.status');
  });

  it('no expone el telefono de contacto', async () => {
    await listCasesByUser('user-1');

    expect(sqlOf(0)).not.toContain('phone_contact');
  });
});

describe('getFeedCases — ORDER BY', () => {
  it('ordena la rama lost solo por recencia', async () => {
    await getFeedCases({ ...baseFeedQuery, listingType: 'lost' });

    expect(orderByOf(sqlOf(0))).toBe('ORDER BY c.created_at DESC LIMIT 15');
  });

  it('ordena la rama found por menos voluntarios dentro de cada gravedad', async () => {
    await getFeedCases({ ...baseFeedQuery, listingType: 'found' });

    expect(orderByOf(sqlOf(0))).toContain(`${FEED_VOLUNTEER_COUNT_EXPR} ASC`);
  });
});

describe('getFeedCases — antiguedad', () => {
  it('deja afuera los casos mas viejos que el tope', async () => {
    await getFeedCases(baseFeedQuery);

    expect(sqlOf(0)).toContain(`c.created_at > NOW() - (:maxAgeDays * INTERVAL '1 day')`);
  });

  it('pasa el tope como replacement y no interpolado en el SQL', async () => {
    await getFeedCases(baseFeedQuery);

    expect(replacementsOf(0)).toMatchObject({ maxAgeDays: FEED_MAX_AGE_DAYS });
    expect(sqlOf(0)).not.toContain(String(FEED_MAX_AGE_DAYS));
  });
});

describe('SELECT de casos — columnas de S2', () => {
  it('la lista trae titulo, codigo publico, estado y seenAt', async () => {
    await listCases(baseListQuery);
    const sql = sqlOf(0);
    expect(sql).toContain('c.title');
    expect(sql).toContain('c.public_code AS "publicCode"');
    expect(sql).toContain('c.animal_condition AS "animalCondition"');
    expect(sql).toContain('c.seen_at AS "seenAt"');
  });

  it('la lista ya no trae condition', async () => {
    await listCases(baseListQuery);
    expect(sqlOf(0)).not.toContain('c.condition');
  });

  it('el feed trae el titulo, que es lo que muestra la tarjeta', async () => {
    await getFeedCases(baseFeedQuery);
    expect(sqlOf(0)).toContain('c.title');
  });

  it('la lista trae whereabouts', async () => {
    await listCases(baseListQuery);
    expect(sqlOf(0)).toContain('c.whereabouts');
  });
});

describe('createCase — apertura del historial', () => {
  it('abre el historial con una novedad de alojamiento cuando alguien lo tiene', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'case-1' }]);
    await createCase('user-1', {
      ...baseCreateInput,
      whereabouts: 'con_un_tercero',
      hostName: 'Marta Gimenez',
    });
    expect(CaseUpdate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId: 'case-1',
        updateType: 'alojamiento',
        hostName: 'Marta Gimenez',
      }),
    );
  });

  it('no abre historial si el animal quedo en la calle', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'case-2' }]);
    await createCase('user-1', { ...baseCreateInput, whereabouts: 'en_la_calle' });
    expect(CaseUpdate.create).not.toHaveBeenCalled();
  });

  it('un caso buscado tampoco abre historial', async () => {
    // 'desconocido' es ausencia de dato, no una garantia de que alguien lo tenga.
    queryMock.mockResolvedValueOnce([{ id: 'case-3' }]);
    await createCase('user-1', { ...baseCreateInput, whereabouts: 'desconocido' });
    expect(CaseUpdate.create).not.toHaveBeenCalled();
  });

  it('manda whereabouts parametrizado al INSERT, no concatenado', async () => {
    queryMock.mockResolvedValueOnce([{ id: 'case-4' }]);
    await createCase('user-1', { ...baseCreateInput, whereabouts: 'con_quien_publica' });
    expect(replacementsOf(0)['whereabouts']).toBe('con_quien_publica');
  });
});
