process.env['JWT_SECRET'] = 'test-secret-that-is-at-least-32-characters-long';
process.env['JWT_ACCESS_EXPIRES'] = '15m';
process.env['JWT_REFRESH_EXPIRES'] = '7d';
process.env['DATABASE_URL'] = 'postgresql://localhost:5432/test';
process.env['ADMIN_EMAILS'] = 'admin@test.com';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('./improvements.service', () => ({
  createImprovement: vi.fn(),
}));

vi.mock('../../db', () => ({
  sequelize: { authenticate: vi.fn().mockResolvedValue(undefined) },
  User: { findOne: vi.fn(), findByPk: vi.fn() },
  RefreshToken: { findOne: vi.fn() },
  Case: { findByPk: vi.fn() },
  CaseImage: { bulkCreate: vi.fn(), findAll: vi.fn() },
  CaseUpdate: { create: vi.fn(), findAll: vi.fn() },
  Contact: { findOne: vi.fn() },
  Report: { findOne: vi.fn() },
}));

vi.mock('../../jobs/queue', () => ({
  notifyNewCaseQueue: null,
  contactRequestQueue: null,
}));

import app from '../../app';
import * as svc from './improvements.service';
import { signAccessToken } from '../auth/auth.tokens';

const adminId = 'admin-uuid-1';
const userId = 'user-uuid-1';
const adminHeader = `Bearer ${signAccessToken({ sub: adminId, email: 'admin@test.com', emailVerified: true })}`;
const userHeader = `Bearer ${signAccessToken({ sub: userId, email: 'user@test.com', emailVerified: true })}`;

const fakeImprovement = {
  id: '55555555-0000-0000-0000-000000000001',
  userId: adminId,
  note: 'el filtro de tamaño no se resetea',
  route: '/cases',
  userAgent: 'iPhone',
  status: 'pending',
  resolutionNotes: null,
  createdAt: new Date('2026-08-10T10:00:00Z'),
  resolvedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(svc.createImprovement).mockResolvedValue(fakeImprovement);
});

describe('POST /api/v1/improvements', () => {
  it('guarda la nota del admin y devuelve 204', async () => {
    const res = await request(app)
      .post('/api/v1/improvements')
      .set('Authorization', adminHeader)
      .send({ note: 'el filtro de tamaño no se resetea', route: '/cases', userAgent: 'iPhone' });

    expect(res.status).toBe(204);
    expect(svc.createImprovement).toHaveBeenCalledWith(adminId, {
      note: 'el filtro de tamaño no se resetea',
      route: '/cases',
      userAgent: 'iPhone',
    });
  });

  it('rechaza a un usuario autenticado que no es admin', async () => {
    const res = await request(app)
      .post('/api/v1/improvements')
      .set('Authorization', userHeader)
      .send({ note: 'deberia poder anotar?' });

    expect(res.status).toBe(403);
    expect(svc.createImprovement).not.toHaveBeenCalled();
  });

  it('rechaza a un anonimo', async () => {
    const res = await request(app).post('/api/v1/improvements').send({ note: 'hola' });

    expect(res.status).toBe(401);
    expect(svc.createImprovement).not.toHaveBeenCalled();
  });

  it('rechaza una nota vacia', async () => {
    const res = await request(app)
      .post('/api/v1/improvements')
      .set('Authorization', adminHeader)
      .send({ note: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(svc.createImprovement).not.toHaveBeenCalled();
  });

  it('trunca una ruta larguisima en vez de rechazar la nota', async () => {
    // La ruta la adjunta el cliente solo. Si una URL con muchos query params tirara 400,
    // se perderia la nota que el admin si escribio a mano.
    const rutaLarga = '/cases?' + 'x=1&'.repeat(200);

    const res = await request(app)
      .post('/api/v1/improvements')
      .set('Authorization', adminHeader)
      .send({ note: 'algo raro aca', route: rutaLarga });

    expect(res.status).toBe(204);
    const [, input] = vi.mocked(svc.createImprovement).mock.calls[0]!;
    expect(input.route).toHaveLength(255);
    expect(input.note).toBe('algo raro aca');
  });

  it('acepta una nota sin contexto adjunto', async () => {
    const res = await request(app)
      .post('/api/v1/improvements')
      .set('Authorization', adminHeader)
      .send({ note: 'solo el texto' });

    expect(res.status).toBe(204);
    expect(svc.createImprovement).toHaveBeenCalledWith(adminId, { note: 'solo el texto' });
  });
});
