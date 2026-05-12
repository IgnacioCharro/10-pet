process.env['JWT_SECRET'] = 'test-secret-that-is-at-least-32-characters-long';
process.env['JWT_ACCESS_EXPIRES'] = '15m';
process.env['JWT_REFRESH_EXPIRES'] = '7d';
process.env['DATABASE_URL'] = 'postgresql://localhost:5432/test';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../modules/auth/auth.service', () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  rotateRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
  verifyEmail: vi.fn(),
  findOrCreateGoogleUser: vi.fn(),
}));

vi.mock('../../db', () => ({
  sequelize: { authenticate: vi.fn().mockResolvedValue(undefined) },
  User: { findByPk: vi.fn(), update: vi.fn() },
  Case: { findAll: vi.fn() },
  RefreshToken: {},
}));

import app from '../../app';
import * as db from '../../db';
import { signAccessToken } from '../auth/auth.tokens';

const makeToken = (id = 'uuid-1', email = 'a@b.com') =>
  signAccessToken({ sub: id, email, emailVerified: true });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/users/me', () => {
  it('devuelve 401 sin Authorization header', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });

  it('devuelve 401 con token invalido', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer bad.token.here');
    expect(res.status).toBe(401);
  });

  it('devuelve 200 con el perfil del usuario autenticado', async () => {
    const fakeUser = {
      id: 'uuid-1',
      email: 'a@b.com',
      name: 'Test User',
      emailVerified: false,
      isVet: false,
      vetLicense: null,
      createdAt: new Date('2026-04-20'),
    };
    vi.mocked(db.User.findByPk).mockResolvedValueOnce(fakeUser as never);

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('a@b.com');
    expect(res.body.emailVerified).toBe(false);
  });

  it('devuelve 404 si el usuario no existe en DB', async () => {
    vi.mocked(db.User.findByPk).mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/v1/users/me', () => {
  it('actualiza el nombre del usuario y devuelve 200', async () => {
    const fakeUser = {
      id: 'uuid-1',
      email: 'a@b.com',
      name: 'Nombre Nuevo',
      emailVerified: true,
      isVet: false,
      vetLicense: null,
      createdAt: new Date('2026-04-20'),
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(db.User.findByPk).mockResolvedValueOnce(fakeUser as never);

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Nombre Nuevo' });

    expect(res.status).toBe(200);
    expect(fakeUser.save).toHaveBeenCalled();
    expect(res.body.name).toBe('Nombre Nuevo');
  });

  it('devuelve 400 con nombre vacio', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devuelve 404 si el usuario no existe', async () => {
    vi.mocked(db.User.findByPk).mockResolvedValueOnce(null);

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Alguien' });

    expect(res.status).toBe(404);
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).patch('/api/v1/users/me').send({ name: 'X' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/users/me/cases', () => {
  it('devuelve los casos del usuario autenticado', async () => {
    vi.mocked(db.Case.findAll).mockResolvedValueOnce([
      { id: 'c-1', animalType: 'perro' },
    ] as never);

    const res = await request(app)
      .get('/api/v1/users/me/cases')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.cases).toHaveLength(1);
    expect(res.body.cases[0].id).toBe('c-1');
  });

  it('devuelve lista vacia si el usuario no tiene casos', async () => {
    vi.mocked(db.Case.findAll).mockResolvedValueOnce([] as never);

    const res = await request(app)
      .get('/api/v1/users/me/cases')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.cases).toHaveLength(0);
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/v1/users/me/cases');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/users/me/push-token', () => {
  it('guarda el token y devuelve 204', async () => {
    vi.mocked(db.User.update).mockResolvedValueOnce([1] as never);

    const res = await request(app)
      .post('/api/v1/users/me/push-token')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ token: 'fcm-token-abc123' });

    expect(res.status).toBe(204);
    expect(db.User.update).toHaveBeenCalledWith(
      { pushToken: 'fcm-token-abc123' },
      { where: { id: 'uuid-1' } },
    );
  });

  it('devuelve 400 con token vacio', async () => {
    const res = await request(app)
      .post('/api/v1/users/me/push-token')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ token: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devuelve 401 sin token de autenticacion', async () => {
    const res = await request(app)
      .post('/api/v1/users/me/push-token')
      .send({ token: 'fcm-abc' });
    expect(res.status).toBe(401);
  });
});
