process.env['JWT_SECRET'] = 'test-secret-that-is-at-least-32-characters-long';
process.env['JWT_ACCESS_EXPIRES'] = '15m';
process.env['DATABASE_URL'] = 'postgresql://localhost:5432/test';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { DatabaseError } from 'sequelize';

vi.mock('./modules/rescue/cases/cases.service', () => ({
  createCase: vi.fn(),
  insertCaseImages: vi.fn(),
  listCases: vi.fn(),
  getNearbyCases: vi.fn(),
  getFeedCases: vi.fn(),
  getCaseById: vi.fn(),
  updateCase: vi.fn(),
  addCaseUpdate: vi.fn(),
}));

vi.mock('./db', () => ({
  sequelize: { authenticate: vi.fn().mockResolvedValue(undefined) },
  User: { findOne: vi.fn(), findByPk: vi.fn() },
  RefreshToken: { findOne: vi.fn() },
  Case: { findByPk: vi.fn() },
  CaseImage: { bulkCreate: vi.fn(), findAll: vi.fn() },
  CaseUpdate: { create: vi.fn(), findAll: vi.fn() },
}));

import app from './app';
import * as svc from './modules/rescue/cases/cases.service';
import { signAccessToken } from './modules/auth/auth.tokens';

const authHeader = `Bearer ${signAccessToken({
  sub: 'user-uuid-1',
  email: 'user@test.com',
  emailVerified: true,
})}`;

const payloadValido = {
  listingType: 'found',
  title: 'Caballo suelto en la interseccion',
  animalType: 'caballo',
  description: 'Caballo suelto en la interseccion de dos calles',
  location: { lat: -34.176967, lng: -59.7790638 },
  urgencyLevel: 2,
};

const publicar = () =>
  request(app).post('/api/v1/cases').set('Authorization', authHeader).send(payloadValido);

// Construye el error tal como lo entrega Sequelize cuando Postgres rechaza un
// insert por CHECK: el codigo y el nombre del constraint viven en `parent`.
const checkViolation = (constraint: string): DatabaseError => {
  const pgError = Object.assign(new Error('new row violates check constraint'), {
    code: '23514',
    constraint,
  });
  return new DatabaseError(pgError as unknown as Error & { sql: string });
};

describe('error handler de la app', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responde JSON en el formato estandar cuando el error escapa del controller', async () => {
    // Sin un handler propio esto lo contesta Express con HTML, el front no
    // encuentra data.error.message y muestra un texto generico: el fallo es mudo.
    vi.mocked(svc.createCase).mockRejectedValue(new Error('boom inesperado'));

    const res = await publicar();

    expect(res.status).toBe(500);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.message).toBeTruthy();
  });

  it('no filtra el detalle interno del error al cliente', async () => {
    vi.mocked(svc.createCase).mockRejectedValue(new Error('password=hunter2 en el DSN'));

    const res = await publicar();

    expect(JSON.stringify(res.body)).not.toContain('hunter2');
  });

  it('traduce un CHECK violation a 400 nombrando el constraint', async () => {
    // Es el caso real que rompio publicar un caballo: la app aceptaba el valor y
    // la base lo rechazaba. Un 500 opaco no deja ver de donde viene.
    vi.mocked(svc.createCase).mockRejectedValue(checkViolation('cases_animal_type_check'));

    const res = await publicar();

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('cases_animal_type_check');
  });

  it('deja pasar las respuestas exitosas sin tocarlas', async () => {
    vi.mocked(svc.createCase).mockResolvedValue({ id: 'case-uuid-1' } as never);

    const res = await publicar();

    expect(res.status).toBe(201);
  });
});
