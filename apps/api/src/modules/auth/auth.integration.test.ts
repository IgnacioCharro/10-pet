process.env['JWT_SECRET'] = 'test-secret-that-is-at-least-32-characters-long';
process.env['JWT_ACCESS_EXPIRES'] = '15m';
process.env['JWT_REFRESH_EXPIRES'] = '7d';
process.env['DATABASE_URL'] = 'postgresql://localhost:5432/test';

import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { AuthError } from './auth.errors';

vi.mock('./auth.service', () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  rotateRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
  verifyEmail: vi.fn(),
  findOrCreateGoogleUser: vi.fn(),
}));

vi.mock('../../db', () => ({
  sequelize: { authenticate: vi.fn().mockResolvedValue(undefined) },
  User: { findOne: vi.fn(), create: vi.fn(), findByPk: vi.fn() },
  RefreshToken: { create: vi.fn(), findOne: vi.fn(), update: vi.fn() },
}));

import app from '../../app';
import * as svc from './auth.service';

const fakeTokens = {
  accessToken: 'access.token.fake',
  refreshToken: 'refresh-token-fake',
  user: { id: 'uuid-1', email: 'a@b.com', emailVerified: false },
};

describe('POST /api/v1/auth/register', () => {
  it('devuelve 201 con tokens cuando los datos son validos', async () => {
    vi.mocked(svc.registerUser).mockResolvedValueOnce(fakeTokens);
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'a@b.com', password: 'password1' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('devuelve 400 cuando el password es muy corto', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'a@b.com', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devuelve 409 cuando el email ya existe', async () => {
    vi.mocked(svc.registerUser).mockRejectedValueOnce(
      new AuthError('EMAIL_ALREADY_REGISTERED', 'El email ya esta registrado', 409),
    );
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'existing@b.com', password: 'password1' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('devuelve 200 con tokens cuando las credenciales son validas', async () => {
    vi.mocked(svc.loginUser).mockResolvedValueOnce(fakeTokens);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'a@b.com', password: 'password1' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('devuelve 401 con credenciales incorrectas', async () => {
    vi.mocked(svc.loginUser).mockRejectedValueOnce(
      new AuthError('INVALID_CREDENTIALS', 'Credenciales invalidas', 401),
    );
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'a@b.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('devuelve 200 con nuevos tokens cuando el refresh token es valido', async () => {
    vi.mocked(svc.rotateRefreshToken).mockResolvedValueOnce({
      accessToken: 'new.access.token',
      refreshToken: 'new-refresh-token',
    });
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'valid-refresh-token' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('devuelve 401 con refresh token invalido', async () => {
    vi.mocked(svc.rotateRefreshToken).mockRejectedValueOnce(
      new AuthError('INVALID_REFRESH_TOKEN', 'Refresh token invalido', 401),
    );
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'bad-token' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('devuelve 204', async () => {
    vi.mocked(svc.revokeRefreshToken).mockResolvedValueOnce(undefined);
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken: 'some-token' });
    expect(res.status).toBe(204);
  });
});

describe('GET /api/v1/auth/verify-email', () => {
  it('redirige al frontend cuando el token es valido', async () => {
    vi.mocked(svc.verifyEmail).mockResolvedValueOnce(undefined);
    const res = await request(app).get('/api/v1/auth/verify-email?token=validtoken');
    expect(res.status).toBe(302);
    expect(res.headers['location']).toContain('/auth/verified');
  });

  it('devuelve 400 cuando falta el token', async () => {
    const res = await request(app).get('/api/v1/auth/verify-email');
    expect(res.status).toBe(400);
  });
});
