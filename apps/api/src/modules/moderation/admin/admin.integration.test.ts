process.env['JWT_SECRET'] = 'test-secret-that-is-at-least-32-characters-long';
process.env['JWT_ACCESS_EXPIRES'] = '15m';
process.env['JWT_REFRESH_EXPIRES'] = '7d';
process.env['DATABASE_URL'] = 'postgresql://localhost:5432/test';
process.env['ADMIN_EMAILS'] = 'admin@test.com';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('./admin.service', () => ({
  getAdminStats: vi.fn(),
  listAdminUsers: vi.fn(),
  banUser: vi.fn(),
  patchAdminCase: vi.fn(),
}));

vi.mock('../../../db', () => ({
  sequelize: { authenticate: vi.fn().mockResolvedValue(undefined) },
  User: { findOne: vi.fn(), findByPk: vi.fn() },
  RefreshToken: { findOne: vi.fn(), destroy: vi.fn() },
  Case: { findByPk: vi.fn() },
  CaseImage: { bulkCreate: vi.fn(), findAll: vi.fn() },
  CaseUpdate: { create: vi.fn(), findAll: vi.fn() },
  Contact: { findOne: vi.fn() },
  Report: { findOne: vi.fn() },
}));

vi.mock('../../../jobs/queue', () => ({
  notifyNewCaseQueue: null,
  contactRequestQueue: null,
}));

import app from '../../../app';
import * as svc from './admin.service';
import { signAccessToken } from '../../auth/auth.tokens';

const userId = 'user-uuid-1';
const adminId = 'admin-uuid-1';
const userHeader = `Bearer ${signAccessToken({ sub: userId, email: 'user@test.com' })}`;
const adminHeader = `Bearer ${signAccessToken({ sub: adminId, email: 'admin@test.com' })}`;

const fakeStats: svc.AdminStats = {
  totalUsers: 10,
  newUsersLast7d: 3,
  totalCases: 25,
  newCasesLast7d: 5,
  casesByStatus: { abierto: 15, en_rescate: 5, resuelto: 3, inactivo: 2 },
  pendingReports: 2,
};

const fakeUsers = [
  {
    id: userId,
    email: 'user@test.com',
    name: 'Test User',
    emailVerified: true,
    bannedAt: null,
    casesCount: 3,
    createdAt: new Date('2026-04-01'),
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/admin/stats', () => {
  it('retorna estadisticas para admin', async () => {
    vi.mocked(svc.getAdminStats).mockResolvedValueOnce(fakeStats);
    const res = await request(app).get('/api/v1/admin/stats').set('Authorization', adminHeader);
    expect(res.status).toBe(200);
    expect(res.body.totalUsers).toBe(10);
    expect(res.body.pendingReports).toBe(2);
  });

  it('rechaza a usuario no admin (403)', async () => {
    const res = await request(app).get('/api/v1/admin/stats').set('Authorization', userHeader);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rechaza sin token (401)', async () => {
    const res = await request(app).get('/api/v1/admin/stats');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/admin/users', () => {
  it('lista usuarios para admin', async () => {
    vi.mocked(svc.listAdminUsers).mockResolvedValueOnce({ users: fakeUsers, total: 1 });
    const res = await request(app).get('/api/v1/admin/users').set('Authorization', adminHeader);
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it('rechaza a usuario no admin', async () => {
    const res = await request(app).get('/api/v1/admin/users').set('Authorization', userHeader);
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/v1/admin/users/:id', () => {
  it('banea un usuario', async () => {
    vi.mocked(svc.banUser).mockResolvedValueOnce({ ok: true });
    const res = await request(app)
      .patch(`/api/v1/admin/users/${userId}`)
      .set('Authorization', adminHeader)
      .send({ action: 'ban' });
    expect(res.status).toBe(204);
  });

  it('desbanea un usuario', async () => {
    vi.mocked(svc.banUser).mockResolvedValueOnce({ ok: true });
    const res = await request(app)
      .patch(`/api/v1/admin/users/${userId}`)
      .set('Authorization', adminHeader)
      .send({ action: 'unban' });
    expect(res.status).toBe(204);
  });

  it('devuelve 404 si usuario no existe', async () => {
    vi.mocked(svc.banUser).mockResolvedValueOnce({
      error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado', status: 404 },
    });
    const res = await request(app)
      .patch(`/api/v1/admin/users/nonexistent`)
      .set('Authorization', adminHeader)
      .send({ action: 'ban' });
    expect(res.status).toBe(404);
  });

  it('valida action invalida (400)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${userId}`)
      .set('Authorization', adminHeader)
      .send({ action: 'delete' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/v1/admin/cases/:id', () => {
  it('elimina un caso', async () => {
    vi.mocked(svc.patchAdminCase).mockResolvedValueOnce({ ok: true });
    const res = await request(app)
      .patch(`/api/v1/admin/cases/case-uuid-1`)
      .set('Authorization', adminHeader)
      .send({ action: 'delete' });
    expect(res.status).toBe(204);
  });

  it('restaura un caso', async () => {
    vi.mocked(svc.patchAdminCase).mockResolvedValueOnce({ ok: true });
    const res = await request(app)
      .patch(`/api/v1/admin/cases/case-uuid-1`)
      .set('Authorization', adminHeader)
      .send({ action: 'restore' });
    expect(res.status).toBe(204);
  });

  it('devuelve 404 si caso no existe', async () => {
    vi.mocked(svc.patchAdminCase).mockResolvedValueOnce({
      error: { code: 'CASE_NOT_FOUND', message: 'Caso no encontrado', status: 404 },
    });
    const res = await request(app)
      .patch(`/api/v1/admin/cases/nonexistent`)
      .set('Authorization', adminHeader)
      .send({ action: 'delete' });
    expect(res.status).toBe(404);
  });

  it('rechaza a usuario no admin', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/cases/case-uuid-1`)
      .set('Authorization', userHeader)
      .send({ action: 'delete' });
    expect(res.status).toBe(403);
  });
});
