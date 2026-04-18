process.env['JWT_SECRET'] = 'test-secret-that-is-at-least-32-characters-long';
process.env['JWT_ACCESS_EXPIRES'] = '15m';
process.env['JWT_REFRESH_EXPIRES'] = '7d';
process.env['DATABASE_URL'] = 'postgresql://localhost:5432/test';
process.env['ADMIN_EMAILS'] = '';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('./contacts.service', () => ({
  createContact: vi.fn(),
  listContacts: vi.fn(),
  getContactById: vi.fn(),
  updateContact: vi.fn(),
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
import * as svc from './contacts.service';
import { signAccessToken } from '../../auth/auth.tokens';

const userId = 'user-uuid-1';
const authHeader = `Bearer ${signAccessToken({ sub: userId, email: 'user@test.com' })}`;

const fakeContact = {
  id: '22222222-0000-0000-0000-000000000001',
  caseId: '11111111-0000-0000-0000-000000000001',
  initiatorId: userId,
  responderId: '33333333-0000-0000-0000-000000000001',
  status: 'pending',
  contactMethod: 'whatsapp',
  message: 'Quiero ayudar',
  lastMessageAt: null,
  createdAt: new Date('2026-04-22T10:00:00Z'),
  updatedAt: new Date('2026-04-22T10:00:00Z'),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/contacts', () => {
  it('crea un contacto y devuelve 201', async () => {
    vi.mocked(svc.createContact).mockResolvedValueOnce({
      contact: fakeContact,
      whatsappLink: 'https://wa.me/541112345678?text=Hola',
    });

    const res = await request(app)
      .post('/api/v1/contacts')
      .set('Authorization', authHeader)
      .send({ caseId: '11111111-0000-0000-0000-000000000001', message: 'Quiero ayudar' });

    expect(res.status).toBe(201);
    expect(res.body.contact.id).toBe('22222222-0000-0000-0000-000000000001');
    expect(res.body.whatsappLink).toContain('wa.me');
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).post('/api/v1/contacts').send({ caseId: '11111111-0000-0000-0000-000000000001' });
    expect(res.status).toBe(401);
  });

  it('devuelve 400 con body invalido', async () => {
    const res = await request(app)
      .post('/api/v1/contacts')
      .set('Authorization', authHeader)
      .send({ caseId: 'not-a-uuid' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devuelve 400 si contacta su propio caso', async () => {
    vi.mocked(svc.createContact).mockResolvedValueOnce({
      error: { code: 'OWN_CASE', message: 'No podés contactar tu propio caso', status: 400 },
    });

    const res = await request(app)
      .post('/api/v1/contacts')
      .set('Authorization', authHeader)
      .send({ caseId: '11111111-0000-0000-0000-000000000001' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OWN_CASE');
  });

  it('devuelve 409 si ya contactó el caso', async () => {
    vi.mocked(svc.createContact).mockResolvedValueOnce({
      error: { code: 'ALREADY_CONTACTED', message: 'Ya enviaste una solicitud', status: 409 },
    });

    const res = await request(app)
      .post('/api/v1/contacts')
      .set('Authorization', authHeader)
      .send({ caseId: '11111111-0000-0000-0000-000000000001' });

    expect(res.status).toBe(409);
  });
});

describe('GET /api/v1/contacts', () => {
  it('lista contactos del usuario autenticado', async () => {
    vi.mocked(svc.listContacts).mockResolvedValueOnce({
      contacts: [fakeContact],
      total: 1,
    });

    const res = await request(app)
      .get('/api/v1/contacts')
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.contacts).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/v1/contacts');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/v1/contacts/:id', () => {
  it('actualiza el status del contacto', async () => {
    vi.mocked(svc.updateContact).mockResolvedValueOnce({ ...fakeContact, status: 'active' });

    const res = await request(app)
      .patch('/api/v1/contacts/contact-uuid-1')
      .set('Authorization', authHeader)
      .send({ status: 'active' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
  });

  it('devuelve 400 con status invalido', async () => {
    const res = await request(app)
      .patch('/api/v1/contacts/contact-uuid-1')
      .set('Authorization', authHeader)
      .send({ status: 'inexistente' });

    expect(res.status).toBe(400);
  });

  it('devuelve 403 si no es el responder', async () => {
    vi.mocked(svc.updateContact).mockResolvedValueOnce({
      error: { code: 'FORBIDDEN', message: 'Solo el reportador puede aceptar o rechazar', status: 403 },
    });

    const res = await request(app)
      .patch('/api/v1/contacts/contact-uuid-1')
      .set('Authorization', authHeader)
      .send({ status: 'active' });

    expect(res.status).toBe(403);
  });
});
