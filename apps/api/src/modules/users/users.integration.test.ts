process.env['JWT_SECRET'] = 'test-secret-that-is-at-least-32-characters-long';
process.env['JWT_ACCESS_EXPIRES'] = '15m';
process.env['JWT_REFRESH_EXPIRES'] = '7d';
process.env['DATABASE_URL'] = 'postgresql://localhost:5432/test';

import { describe, it, expect, vi } from 'vitest';
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
  User: { findByPk: vi.fn() },
  RefreshToken: {},
}));

import app from '../../app';
import * as db from '../../db';
import { signAccessToken } from '../auth/auth.tokens';

const makeToken = (id = 'uuid-1', email = 'a@b.com') =>
  signAccessToken({ sub: id, email });

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
      emailVerified: false,
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
