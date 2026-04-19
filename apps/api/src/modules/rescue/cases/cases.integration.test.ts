process.env['JWT_SECRET'] = 'test-secret-that-is-at-least-32-characters-long';
process.env['JWT_ACCESS_EXPIRES'] = '15m';
process.env['JWT_REFRESH_EXPIRES'] = '7d';
process.env['DATABASE_URL'] = 'postgresql://localhost:5432/test';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('./cases.service', () => ({
  createCase: vi.fn(),
  insertCaseImages: vi.fn(),
  listCases: vi.fn(),
  getNearbyCases: vi.fn(),
  getCaseById: vi.fn(),
  updateCase: vi.fn(),
  addCaseUpdate: vi.fn(),
}));

vi.mock('../../../db', () => ({
  sequelize: { authenticate: vi.fn().mockResolvedValue(undefined) },
  User: { findOne: vi.fn(), findByPk: vi.fn() },
  RefreshToken: { findOne: vi.fn() },
  Case: { findByPk: vi.fn() },
  CaseImage: { bulkCreate: vi.fn(), findAll: vi.fn() },
  CaseUpdate: { create: vi.fn(), findAll: vi.fn() },
}));

import app from '../../../app';
import * as svc from './cases.service';
import { signAccessToken } from '../../auth/auth.tokens';

const authHeader = `Bearer ${signAccessToken({ sub: 'user-uuid-1', email: 'user@test.com' })}`;

const fakeCase = {
  id: 'case-uuid-1',
  userId: 'user-uuid-1',
  animalType: 'perro',
  description: 'Perro herido en la calle sin collar',
  status: 'abierto',
  resolutionType: null,
  urgencyLevel: 3,
  lat: -34.6037,
  lng: -58.3816,
  locationText: 'Av. Corrientes 1234',
  condition: 'herido',
  createdAt: new Date('2026-04-21T10:00:00Z'),
  updatedAt: new Date('2026-04-21T10:00:00Z'),
  resolvedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/cases', () => {
  it('crea un caso y devuelve 201', async () => {
    vi.mocked(svc.createCase).mockResolvedValueOnce(fakeCase);
    vi.mocked(svc.insertCaseImages).mockResolvedValueOnce();

    const res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', authHeader)
      .send({
        animalType: 'perro',
        description: 'Perro herido en la calle sin collar',
        location: { lat: -34.6037, lng: -58.3816 },
        urgencyLevel: 3,
        condition: 'herido',
      });

    expect(res.status).toBe(201);
    expect(res.body.case.id).toBe('case-uuid-1');
    expect(res.body.case.animalType).toBe('perro');
  });

  it('devuelve 400 con descripcion muy corta', async () => {
    const res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', authHeader)
      .send({
        animalType: 'perro',
        description: 'corta',
        location: { lat: -34.6037, lng: -58.3816 },
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devuelve 400 con animal_type invalido', async () => {
    const res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', authHeader)
      .send({
        animalType: 'caballo',
        description: 'Descripcion suficientemente larga para pasar validacion',
        location: { lat: -34.6037, lng: -58.3816 },
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app)
      .post('/api/v1/cases')
      .send({ animalType: 'perro', description: 'Texto', location: { lat: 0, lng: 0 } });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/cases', () => {
  it('devuelve lista de casos con meta', async () => {
    vi.mocked(svc.listCases).mockResolvedValueOnce({ cases: [fakeCase], total: 1 });

    const res = await request(app).get('/api/v1/cases');

    expect(res.status).toBe(200);
    expect(res.body.cases).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.meta.page).toBe(1);
  });

  it('devuelve 400 con parametros invalidos', async () => {
    const res = await request(app).get('/api/v1/cases?lat=999');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/cases/nearby', () => {
  it('devuelve casos cercanos', async () => {
    vi.mocked(svc.getNearbyCases).mockResolvedValueOnce([
      { ...fakeCase, distanceKm: 0.5 },
    ]);

    const res = await request(app).get('/api/v1/cases/nearby?lat=-34.6&lng=-58.38&radius=5');

    expect(res.status).toBe(200);
    expect(res.body.cases).toHaveLength(1);
  });

  it('devuelve 400 sin lat/lng', async () => {
    const res = await request(app).get('/api/v1/cases/nearby');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/cases/:id', () => {
  it('devuelve detalle del caso con images y updates', async () => {
    vi.mocked(svc.getCaseById).mockResolvedValueOnce({
      ...fakeCase,
      images: [],
      updates: [],
    });

    const res = await request(app).get('/api/v1/cases/case-uuid-1');

    expect(res.status).toBe(200);
    expect(res.body.case.id).toBe('case-uuid-1');
    expect(res.body.case).toHaveProperty('images');
    expect(res.body.case).toHaveProperty('updates');
  });

  it('devuelve 404 para caso inexistente', async () => {
    vi.mocked(svc.getCaseById).mockResolvedValueOnce(null);

    const res = await request(app).get('/api/v1/cases/nonexistent-id');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CASE_NOT_FOUND');
  });
});

describe('PATCH /api/v1/cases/:id', () => {
  it('actualiza estado del caso', async () => {
    vi.mocked(svc.updateCase).mockResolvedValueOnce({
      ...fakeCase,
      status: 'en_rescate',
    });

    const res = await request(app)
      .patch('/api/v1/cases/case-uuid-1')
      .set('Authorization', authHeader)
      .send({ status: 'en_rescate' });

    expect(res.status).toBe(200);
    expect(res.body.case.status).toBe('en_rescate');
  });

  it('devuelve 400 con body vacio', async () => {
    const res = await request(app)
      .patch('/api/v1/cases/case-uuid-1')
      .set('Authorization', authHeader)
      .send({});

    expect(res.status).toBe(400);
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app)
      .patch('/api/v1/cases/case-uuid-1')
      .send({ status: 'en_rescate' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/cases/:id/updates', () => {
  it('agrega un update al caso', async () => {
    const fakeUpdate = {
      id: 'update-uuid-1',
      userId: 'user-uuid-1',
      updateType: 'comment',
      content: 'El perro fue asistido por veterinaria',
      createdAt: new Date(),
    };
    vi.mocked(svc.addCaseUpdate).mockResolvedValueOnce(fakeUpdate);

    const res = await request(app)
      .post('/api/v1/cases/case-uuid-1/updates')
      .set('Authorization', authHeader)
      .send({ updateType: 'comment', content: 'El perro fue asistido por veterinaria' });

    expect(res.status).toBe(201);
    expect(res.body.update.updateType).toBe('comment');
  });

  it('devuelve 400 con updateType invalido', async () => {
    const res = await request(app)
      .post('/api/v1/cases/case-uuid-1/updates')
      .set('Authorization', authHeader)
      .send({ updateType: 'invalid_type' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
