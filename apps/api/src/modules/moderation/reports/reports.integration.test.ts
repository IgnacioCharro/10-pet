process.env['JWT_SECRET'] = 'test-secret-that-is-at-least-32-characters-long';
process.env['JWT_ACCESS_EXPIRES'] = '15m';
process.env['JWT_REFRESH_EXPIRES'] = '7d';
process.env['DATABASE_URL'] = 'postgresql://localhost:5432/test';
process.env['ADMIN_EMAILS'] = 'admin@test.com';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('./reports.service', () => ({
  createCaseReport: vi.fn(),
  listReports: vi.fn(),
  updateReport: vi.fn(),
}));

vi.mock('../../../db', () => ({
  sequelize: { authenticate: vi.fn().mockResolvedValue(undefined) },
  User: { findOne: vi.fn(), findByPk: vi.fn() },
  RefreshToken: { findOne: vi.fn() },
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
import * as svc from './reports.service';
import { signAccessToken } from '../../auth/auth.tokens';

const userId = 'user-uuid-1';
const adminId = 'admin-uuid-1';
const authHeader = `Bearer ${signAccessToken({ sub: userId, email: 'user@test.com' })}`;
const adminHeader = `Bearer ${signAccessToken({ sub: adminId, email: 'admin@test.com' })}`;

const fakeReport = {
  id: '44444444-0000-0000-0000-000000000001',
  reporterId: userId,
  targetCaseId: '11111111-0000-0000-0000-000000000001',
  targetUserId: null,
  reason: 'spam',
  description: 'Es un caso falso',
  status: 'pending',
  reviewedAt: null,
  createdAt: new Date('2026-04-22T10:00:00Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/cases/:caseId/report', () => {
  it('crea un reporte y devuelve 204', async () => {
    vi.mocked(svc.createCaseReport).mockResolvedValueOnce(fakeReport);

    const res = await request(app)
      .post('/api/v1/cases/case-uuid-1/report')
      .set('Authorization', authHeader)
      .send({ reason: 'spam', description: 'Es un caso falso' });

    expect(res.status).toBe(204);
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app)
      .post('/api/v1/cases/case-uuid-1/report')
      .send({ reason: 'spam' });
    expect(res.status).toBe(401);
  });

  it('devuelve 400 con reason invalida', async () => {
    const res = await request(app)
      .post('/api/v1/cases/case-uuid-1/report')
      .set('Authorization', authHeader)
      .send({ reason: 'motivo_invalido' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devuelve 400 si reporta su propio caso', async () => {
    vi.mocked(svc.createCaseReport).mockResolvedValueOnce({
      error: { code: 'OWN_CASE', message: 'No podés reportar tu propio caso', status: 400 },
    });

    const res = await request(app)
      .post('/api/v1/cases/case-uuid-1/report')
      .set('Authorization', authHeader)
      .send({ reason: 'falso' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OWN_CASE');
  });

  it('devuelve 409 si ya reportó recientemente', async () => {
    vi.mocked(svc.createCaseReport).mockResolvedValueOnce({
      error: { code: 'ALREADY_REPORTED', message: 'Ya reportaste este caso', status: 409 },
    });

    const res = await request(app)
      .post('/api/v1/cases/case-uuid-1/report')
      .set('Authorization', authHeader)
      .send({ reason: 'spam' });

    expect(res.status).toBe(409);
  });
});

describe('GET /api/v1/admin/reports', () => {
  it('devuelve lista de reportes para admin', async () => {
    vi.mocked(svc.listReports).mockResolvedValueOnce({
      reports: [fakeReport],
      total: 1,
    });

    const res = await request(app)
      .get('/api/v1/admin/reports')
      .set('Authorization', adminHeader);

    expect(res.status).toBe(200);
    expect(res.body.reports).toHaveLength(1);
  });

  it('devuelve 403 para usuario no admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/reports')
      .set('Authorization', authHeader);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/v1/admin/reports');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/v1/admin/reports/:id', () => {
  it('actualiza el status del reporte', async () => {
    vi.mocked(svc.updateReport).mockResolvedValueOnce({ ...fakeReport, status: 'dismissed' });

    const res = await request(app)
      .patch('/api/v1/admin/reports/report-uuid-1')
      .set('Authorization', adminHeader)
      .send({ status: 'dismissed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('dismissed');
  });

  it('devuelve 403 para usuario no admin', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/reports/report-uuid-1')
      .set('Authorization', authHeader)
      .send({ status: 'dismissed' });

    expect(res.status).toBe(403);
  });
});
