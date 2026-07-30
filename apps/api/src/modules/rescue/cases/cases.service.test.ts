process.env['JWT_SECRET'] = 'test-secret-that-is-at-least-32-characters-long';
process.env['JWT_ACCESS_EXPIRES'] = '15m';
process.env['JWT_REFRESH_EXPIRES'] = '7d';
process.env['DATABASE_URL'] = 'postgresql://localhost:5432/test';

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

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

import { sequelize } from '../../../db';
import { listCases } from './cases.service';
import { ListCasesQuery } from './cases.validators';

const queryMock = sequelize.query as unknown as Mock;

const baseQuery: ListCasesQuery = { radius: 10, page: 1, limit: 20, sort: 'recent' };

const fakeRow = {
  id: 'case-uuid-1',
  userId: 'user-uuid-1',
  listingType: 'found',
  animalType: 'perro',
  description: 'Perro herido en la calle sin collar',
  status: 'abierto',
  resolutionType: null,
  urgencyLevel: 3,
  lat: -34.6037,
  lng: -58.3816,
  locationText: 'Av. Corrientes 1234',
  condition: 'herido',
  animalSex: null,
  animalSize: null,
  animalColor: null,
  createdAt: new Date('2026-04-21T10:00:00Z'),
  updatedAt: new Date('2026-04-21T10:00:00Z'),
  resolvedAt: null,
  volunteerCount: '2',
};

// Encola primero las filas y luego el total, en el mismo orden en que listCases consulta
const mockQueries = (rows: unknown[] = [fakeRow], total = '1'): void => {
  queryMock.mockResolvedValueOnce(rows).mockResolvedValueOnce([{ total }]);
};

const sqlOf = (callIndex: number): string => queryMock.mock.calls[callIndex][0] as string;

// lastIndexOf: los subqueries del SELECT traen su propio ORDER BY / WHERE
const orderByOf = (sql: string): string =>
  sql.slice(sql.lastIndexOf('ORDER BY') + 'ORDER BY'.length, sql.lastIndexOf('LIMIT')).trim();

const whereOf = (sql: string): string =>
  sql.slice(sql.lastIndexOf('WHERE'), sql.lastIndexOf('ORDER BY')).trim();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listCases — orden por urgencia', () => {
  it('desempata por menos voluntarios y luego por fecha', async () => {
    mockQueries();

    await listCases({ ...baseQuery, sort: 'urgency' });

    expect(orderByOf(sqlOf(0))).toBe(
      'c.urgency_level DESC, "volunteerCount" ASC, c.created_at DESC',
    );
  });

  it('cuenta voluntarios con subquery correlacionada, sin GROUP BY', async () => {
    mockQueries();

    await listCases({ ...baseQuery, sort: 'urgency' });

    const sql = sqlOf(0);
    expect(sql).toContain('FROM contacts co');
    expect(sql).toContain(`co.status IN ('active','completed')`);
    expect(sql).not.toContain('GROUP BY');
  });
});

describe('listCases — otros ordenes', () => {
  it('con sort recent ordena solo por fecha', async () => {
    mockQueries();

    await listCases({ ...baseQuery, sort: 'recent' });

    const orderBy = orderByOf(sqlOf(0));
    expect(orderBy).toBe('c.created_at DESC');
    expect(orderBy).not.toContain('"volunteerCount" ASC');
  });
});

describe('listCases — query de total', () => {
  it('no toca la query del total', async () => {
    mockQueries([fakeRow], '7');

    const result = await listCases({ ...baseQuery, sort: 'urgency' });

    const countSql = sqlOf(1);
    expect(countSql).not.toContain('contacts');
    expect(countSql).not.toContain('volunteerCount');
    expect(result.total).toBe(7);
  });
});

describe('listCases — normalizacion de volunteerCount', () => {
  it('convierte el COUNT string de pg a numero y conserva el caso', async () => {
    mockQueries([{ ...fakeRow, volunteerCount: '0' }]);

    const result = await listCases({ ...baseQuery, sort: 'urgency' });

    expect(result.cases).toHaveLength(1);
    expect(result.cases[0].volunteerCount).toBe(0);
  });
});

describe('listCases — filtro urgencyMin', () => {
  it('sigue filtrando solo por urgency_level', async () => {
    mockQueries();

    await listCases({ ...baseQuery, sort: 'urgency', urgencyMin: 3 });

    const where = whereOf(sqlOf(0));
    expect(where).toContain('c.urgency_level >= :urgencyMin');
    expect(where).not.toContain('contacts');
    expect(where).not.toContain('volunteerCount');
    expect(queryMock.mock.calls[0][1].replacements).toMatchObject({ urgencyMin: 3 });
  });
});
