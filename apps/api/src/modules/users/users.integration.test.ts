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
  sequelize: { authenticate: vi.fn().mockResolvedValue(undefined), query: vi.fn() },
  User: { findByPk: vi.fn(), update: vi.fn() },
  Case: { findAll: vi.fn(), count: vi.fn() },
  Contact: { findAll: vi.fn() },
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

  it('pide isVet y vetLicense a la base', async () => {
    // El perfil los muestra en solo lectura, asi que tienen que venir en el
    // SELECT: sin esto quedan undefined y el sello desaparece al recargar.
    const fakeUser = {
      id: 'uuid-1',
      email: 'a@b.com',
      name: 'Test User',
      emailVerified: true,
      isVet: true,
      vetLicense: 'MP-123',
      createdAt: new Date('2026-04-20'),
    };
    vi.mocked(db.User.findByPk).mockResolvedValueOnce(fakeUser as never);

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.isVet).toBe(true);
    expect(res.body.vetLicense).toBe('MP-123');
    expect(vi.mocked(db.User.findByPk)).toHaveBeenCalledWith(
      'uuid-1',
      expect.objectContaining({
        attributes: expect.arrayContaining(['isVet', 'vetLicense']),
      }),
    );
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

  it('ignora isVet y vetLicense: el perfil propio ya no los escribe', async () => {
    const fakeUser = {
      id: 'uuid-1',
      email: 'a@b.com',
      name: 'Nuevo nombre',
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
      .send({ name: 'Nuevo nombre', isVet: true, vetLicense: 'MP-999' });

    expect(res.status).toBe(200);
    expect(res.body.isVet).toBe(false);
    expect(res.body.vetLicense).toBeNull();
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
    vi.mocked(db.sequelize.query).mockResolvedValueOnce([
      { id: 'c-1', animalType: 'perro', heroUrl: 'https://cdn/foto.jpg' },
    ] as never);

    const res = await request(app)
      .get('/api/v1/users/me/cases')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.cases).toHaveLength(1);
    expect(res.body.cases[0].id).toBe('c-1');
    expect(res.body.cases[0].heroUrl).toBe('https://cdn/foto.jpg');
  });

  it('devuelve lista vacia si el usuario no tiene casos', async () => {
    vi.mocked(db.sequelize.query).mockResolvedValueOnce([] as never);

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

describe('GET /api/v1/users/:id', () => {
  const publicUser = {
    id: 'uuid-target',
    name: 'Rescatista',
    isVet: false,
    createdAt: new Date('2026-04-20'),
  };

  // Tal y como los devuelve Postgres: COUNT llega como string
  const aggregateRows = [
    { status: 'active', count: '2' },
    { status: 'completed', count: '3' },
    { status: 'rejected', count: '4' },
    { status: 'pending', count: '5' },
  ];

  const mockProfile = (rows: unknown[], casesPublished = 0) => {
    vi.mocked(db.User.findByPk).mockResolvedValueOnce(publicUser as never);
    vi.mocked(db.Case.count).mockResolvedValueOnce(casesPublished as never);
    vi.mocked(db.Contact.findAll).mockResolvedValueOnce(rows as never);
  };

  it('devuelve todo a cero para un usuario sin contactos', async () => {
    mockProfile([]);

    const res = await request(app).get('/api/v1/users/uuid-target');

    expect(res.status).toBe(200);
    expect(res.body.offersAccepted).toBe(0);
    expect(res.body.offersCompleted).toBe(0);
    expect(res.body.casesVolunteered).toBe(0);
  });

  it('suma completed a aceptados y no cuenta los pending', async () => {
    mockProfile(aggregateRows);

    const res = await request(app).get('/api/v1/users/uuid-target');

    expect(res.status).toBe(200);
    expect(res.body.offersAccepted).toBe(5);
    expect(res.body.offersCompleted).toBe(3);
    expect(res.body.casesVolunteered).toBe(5);
  });

  it('no cuenta como aceptado un estado que no conoce', async () => {
    mockProfile([
      { status: 'active', count: '2' },
      { status: 'cancelled', count: '9' },
    ]);

    const res = await request(app).get('/api/v1/users/uuid-target');

    expect(res.body.offersAccepted).toBe(2);
    expect(res.body.offersCompleted).toBe(0);
  });

  it('convierte a number los COUNT que Postgres devuelve como string', async () => {
    mockProfile(aggregateRows);

    const res = await request(app).get('/api/v1/users/uuid-target');

    expect(typeof res.body.offersAccepted).toBe('number');
    expect(typeof res.body.offersCompleted).toBe('number');
    expect(typeof res.body.casesVolunteered).toBe('number');
  });

  it('cuenta cero, y no NaN, si la fila viene sin el alias count', async () => {
    mockProfile([{ status: 'active' }, { status: 'completed', count: '3' }]);

    const res = await request(app).get('/api/v1/users/uuid-target');

    expect(res.status).toBe(200);
    expect(res.body.offersAccepted).toBe(3);
    expect(res.body.offersCompleted).toBe(3);
    expect(res.body.casesVolunteered).toBe(3);
  });

  it('nunca expone offersRejected, ni al anonimo ni al autenticado', async () => {
    mockProfile(aggregateRows);
    const anonimo = await request(app).get('/api/v1/users/uuid-target');

    mockProfile(aggregateRows);
    const autenticado = await request(app)
      .get('/api/v1/users/uuid-target')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(anonimo.status).toBe(200);
    expect(autenticado.status).toBe(200);
    expect('offersRejected' in anonimo.body).toBe(false);
    expect('offersRejected' in autenticado.body).toBe(false);
  });

  it('devuelve 404 sin ejecutar ningun conteo si el usuario no existe', async () => {
    vi.mocked(db.User.findByPk).mockResolvedValueOnce(null);

    const res = await request(app).get('/api/v1/users/uuid-target');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
    expect(db.Case.count).not.toHaveBeenCalled();
    expect(db.Contact.findAll).not.toHaveBeenCalled();
  });

  it('mantiene intacto el contrato previo del perfil publico', async () => {
    mockProfile(aggregateRows, 7);

    const res = await request(app).get('/api/v1/users/uuid-target');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('uuid-target');
    expect(res.body.name).toBe('Rescatista');
    expect(res.body.isVet).toBe(false);
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.casesPublished).toBe(7);
    expect(res.body.casesVolunteered).toBe(5);
  });

  it('agrega los contactos en una sola query filtrada por el id de la URL', async () => {
    mockProfile(aggregateRows);

    const res = await request(app).get('/api/v1/users/uuid-target');

    expect(res.status).toBe(200);
    expect(db.Contact.findAll).toHaveBeenCalledTimes(1);
    expect(db.Contact.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { initiatorId: 'uuid-target' } }),
    );
  });
});
