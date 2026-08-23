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
  getPendingCount: vi.fn(),
  getUnreadUpdatesCount: vi.fn(),
  listMessages: vi.fn(),
  createMessage: vi.fn(),
  getUnreadMessagesCount: vi.fn(),
  markThreadRead: vi.fn(),
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
const authHeader = `Bearer ${signAccessToken({ sub: userId, email: 'user@test.com', emailVerified: true })}`;

const fakeContact = {
  id: '22222222-0000-0000-0000-000000000001',
  caseId: '11111111-0000-0000-0000-000000000001',
  initiatorId: userId,
  initiatorName: 'Ana',
  responderId: '33333333-0000-0000-0000-000000000001',
  responderName: 'Juan',
  status: 'pending',
  contactMethod: 'whatsapp',
  message: 'Quiero ayudar',
  lastMessageAt: null,
  createdAt: new Date('2026-04-22T10:00:00Z'),
  updatedAt: new Date('2026-04-22T10:00:00Z'),
  caseAnimalType: 'perro',
  caseLocationText: 'Av. Mitre 400',
};

const fakeMessage = {
  id: '44444444-0000-0000-0000-000000000001',
  contactId: fakeContact.id,
  senderId: userId,
  body: 'Puedo pasar a buscarlo hoy a la tarde',
  createdAt: new Date('2026-08-15T10:00:00Z'),
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

  it('pasa el filtro por caso al service', async () => {
    // La ficha del caso lo usa para saber si el boton lleva al chat que ya
    // existe o abre una solicitud nueva.
    vi.mocked(svc.listContacts).mockResolvedValueOnce({ contacts: [], total: 0 });
    const caseId = '11111111-1111-4111-8111-111111111111';

    const res = await request(app)
      .get(`/api/v1/contacts?caseId=${caseId}`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(vi.mocked(svc.listContacts).mock.calls[0][1]).toMatchObject({ caseId });
  });

  it('pasa el filtro por contraparte al service', async () => {
    vi.mocked(svc.listContacts).mockResolvedValueOnce({ contacts: [], total: 0 });
    const withUserId = '22222222-2222-4222-8222-222222222222';

    const res = await request(app)
      .get(`/api/v1/contacts?withUserId=${withUserId}&status=active`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(vi.mocked(svc.listContacts).mock.calls[0][1]).toMatchObject({
      withUserId,
      status: 'active',
    });
  });

  it('rechaza un filtro que no es UUID en vez de mandarlo al SQL', async () => {
    for (const qs of ['caseId=no-es-uuid', 'withUserId=no-es-uuid']) {
      const res = await request(app)
        .get(`/api/v1/contacts?${qs}`)
        .set('Authorization', authHeader);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });
});

describe('GET /api/v1/contacts/:id', () => {
  it('devuelve el detalle del contacto', async () => {
    vi.mocked(svc.getContactById).mockResolvedValueOnce(fakeContact as never);

    const res = await request(app)
      .get(`/api/v1/contacts/${fakeContact.id}`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(fakeContact.id);
    expect(res.body.status).toBe('pending');
  });

  it('devuelve 404 si el contacto no existe', async () => {
    vi.mocked(svc.getContactById).mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/v1/contacts/non-existent-uuid')
      .set('Authorization', authHeader);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).get(`/api/v1/contacts/${fakeContact.id}`);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/contacts/pending-count', () => {
  it('devuelve el conteo de contactos pendientes de responder', async () => {
    vi.mocked(svc.getPendingCount).mockResolvedValueOnce(3 as never);

    const res = await request(app)
      .get('/api/v1/contacts/pending-count')
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/v1/contacts/pending-count');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/contacts/unread-count', () => {
  it('devuelve el conteo de actualizaciones no leidas', async () => {
    vi.mocked(svc.getUnreadUpdatesCount).mockResolvedValueOnce(5 as never);

    const res = await request(app)
      .get('/api/v1/contacts/unread-count')
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(5);
  });

  it('acepta parametro since como fecha ISO valida', async () => {
    vi.mocked(svc.getUnreadUpdatesCount).mockResolvedValueOnce(2 as never);

    const res = await request(app)
      .get('/api/v1/contacts/unread-count?since=2026-04-20T00:00:00.000Z')
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(svc.getUnreadUpdatesCount).toHaveBeenCalledWith(
      userId,
      expect.any(Date),
    );
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/v1/contacts/unread-count');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/contacts/unread-messages-count', () => {
  it('devuelve el conteo de mensajes no leidos', async () => {
    vi.mocked(svc.getUnreadMessagesCount).mockResolvedValueOnce(4);

    const res = await request(app)
      .get('/api/v1/contacts/unread-messages-count')
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(4);
  });

  it('no lo confunde con el contador de cambios de estado', async () => {
    vi.mocked(svc.getUnreadMessagesCount).mockResolvedValueOnce(4);

    await request(app)
      .get('/api/v1/contacts/unread-messages-count')
      .set('Authorization', authHeader);

    expect(svc.getUnreadUpdatesCount).not.toHaveBeenCalled();
  });

  it('no acepta un since del navegador: la marca de lectura vive en la base', async () => {
    vi.mocked(svc.getUnreadMessagesCount).mockResolvedValueOnce(4);

    await request(app)
      .get('/api/v1/contacts/unread-messages-count?since=2026-08-01T00:00:00.000Z')
      .set('Authorization', authHeader);

    expect(svc.getUnreadMessagesCount).toHaveBeenCalledWith(userId);
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/v1/contacts/unread-messages-count');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/contacts/:id/read', () => {
  it('marca el hilo como leido y devuelve 204', async () => {
    vi.mocked(svc.markThreadRead).mockResolvedValueOnce({ ok: true });

    const res = await request(app)
      .post(`/api/v1/contacts/${fakeContact.id}/read`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(204);
    expect(svc.markThreadRead).toHaveBeenCalledWith(fakeContact.id, userId);
  });

  it('devuelve 403 si el usuario no es parte de la solicitud', async () => {
    vi.mocked(svc.markThreadRead).mockResolvedValueOnce({
      error: { code: 'FORBIDDEN', message: 'Acceso no autorizado', status: 403 },
    });

    const res = await request(app)
      .post(`/api/v1/contacts/${fakeContact.id}/read`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(403);
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).post(`/api/v1/contacts/${fakeContact.id}/read`);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/contacts/:id/messages', () => {
  it('devuelve los mensajes del hilo con el total y si se puede escribir', async () => {
    vi.mocked(svc.listMessages).mockResolvedValueOnce({
      messages: [fakeMessage],
      total: 1,
      canWrite: true,
    });

    const res = await request(app)
      .get(`/api/v1/contacts/${fakeContact.id}/messages`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.messages[0].body).toBe(fakeMessage.body);
    expect(res.body.total).toBe(1);
    expect(res.body.canWrite).toBe(true);
  });

  it('devuelve 403 si el usuario no es parte de la solicitud', async () => {
    vi.mocked(svc.listMessages).mockResolvedValueOnce({
      error: { code: 'FORBIDDEN', message: 'Acceso no autorizado', status: 403 },
    });

    const res = await request(app)
      .get(`/api/v1/contacts/${fakeContact.id}/messages`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('devuelve 404 si la solicitud no existe', async () => {
    vi.mocked(svc.listMessages).mockResolvedValueOnce({
      error: { code: 'NOT_FOUND', message: 'Contacto no encontrado', status: 404 },
    });

    const res = await request(app)
      .get(`/api/v1/contacts/${fakeContact.id}/messages`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(404);
  });

  it('devuelve 400 con paginacion invalida', async () => {
    const res = await request(app)
      .get(`/api/v1/contacts/${fakeContact.id}/messages?limit=500`)
      .set('Authorization', authHeader);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).get(`/api/v1/contacts/${fakeContact.id}/messages`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/contacts/:id/messages', () => {
  it('crea el mensaje y devuelve 201', async () => {
    vi.mocked(svc.createMessage).mockResolvedValueOnce(fakeMessage);

    const res = await request(app)
      .post(`/api/v1/contacts/${fakeContact.id}/messages`)
      .set('Authorization', authHeader)
      .send({ body: fakeMessage.body });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(fakeMessage.id);
    expect(svc.createMessage).toHaveBeenCalledWith(
      fakeContact.id,
      userId,
      { body: fakeMessage.body },
    );
  });

  it('recorta el mensaje antes de guardarlo', async () => {
    vi.mocked(svc.createMessage).mockResolvedValueOnce(fakeMessage);

    await request(app)
      .post(`/api/v1/contacts/${fakeContact.id}/messages`)
      .set('Authorization', authHeader)
      .send({ body: '  hola  ' });

    expect(svc.createMessage).toHaveBeenCalledWith(fakeContact.id, userId, { body: 'hola' });
  });

  it('devuelve 400 con un mensaje que es solo espacios', async () => {
    const res = await request(app)
      .post(`/api/v1/contacts/${fakeContact.id}/messages`)
      .set('Authorization', authHeader)
      .send({ body: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(svc.createMessage).not.toHaveBeenCalled();
  });

  it('devuelve 400 con un mensaje mas largo que el tope', async () => {
    const res = await request(app)
      .post(`/api/v1/contacts/${fakeContact.id}/messages`)
      .set('Authorization', authHeader)
      .send({ body: 'a'.repeat(2001) });

    expect(res.status).toBe(400);
    expect(svc.createMessage).not.toHaveBeenCalled();
  });

  it('devuelve 403 si la solicitud todavia esta pendiente', async () => {
    vi.mocked(svc.createMessage).mockResolvedValueOnce({
      error: {
        code: 'THREAD_NOT_OPEN',
        message: 'La conversacion se abre cuando se acepta la solicitud',
        status: 403,
      },
    });

    const res = await request(app)
      .post(`/api/v1/contacts/${fakeContact.id}/messages`)
      .set('Authorization', authHeader)
      .send({ body: 'hola' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('THREAD_NOT_OPEN');
  });

  it('devuelve 403 si la solicitud ya esta completada', async () => {
    vi.mocked(svc.createMessage).mockResolvedValueOnce({
      error: {
        code: 'THREAD_CLOSED',
        message: 'La solicitud esta completada',
        status: 403,
      },
    });

    const res = await request(app)
      .post(`/api/v1/contacts/${fakeContact.id}/messages`)
      .set('Authorization', authHeader)
      .send({ body: 'hola' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('THREAD_CLOSED');
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app)
      .post(`/api/v1/contacts/${fakeContact.id}/messages`)
      .send({ body: 'hola' });

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
