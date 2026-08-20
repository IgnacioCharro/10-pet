process.env['JWT_SECRET'] = 'test-secret-that-is-at-least-32-characters-long';
process.env['JWT_ACCESS_EXPIRES'] = '15m';
process.env['JWT_REFRESH_EXPIRES'] = '7d';
process.env['DATABASE_URL'] = 'postgresql://localhost:5432/test';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('./cases.service', () => ({
  createCase: vi.fn(),
  insertCaseImages: vi.fn(),
  listCases: vi.fn(),
  getNearbyCases: vi.fn(),
  getFeedCases: vi.fn(),
  getCaseById: vi.fn(),
  updateCase: vi.fn(),
  addCaseUpdate: vi.fn(),
  getZoneStats: vi.fn(),
}));

vi.mock('../../../db', () => ({
  sequelize: { authenticate: vi.fn().mockResolvedValue(undefined) },
  User: { findOne: vi.fn(), findByPk: vi.fn() },
  RefreshToken: { findOne: vi.fn() },
  Case: { findByPk: vi.fn() },
  CaseImage: { bulkCreate: vi.fn(), findAll: vi.fn() },
  CaseUpdate: { create: vi.fn(), findAll: vi.fn() },
}));

import app from '../../../app';
import * as db from '../../../db';
import * as svc from './cases.service';
import { signAccessToken } from '../../auth/auth.tokens';

const authHeader = `Bearer ${signAccessToken({ sub: 'user-uuid-1', email: 'user@test.com', emailVerified: true })}`;
const unverifiedHeader = `Bearer ${signAccessToken({ sub: 'user-uuid-2', email: 'unverified@test.com', emailVerified: false })}`;

const fakeCase = {
  id: 'case-uuid-1',
  userId: 'user-uuid-1',
  animalType: 'perro',
  description: 'Perro herido en la calle sin collar',
  status: 'abierto',
  resolutionType: null,
  urgencyLevel: 3,
  lat: -34.6037,
  lng: -58.3816,
  locationText: 'Av. Corrientes 1234',
  referenceNote: null,
  title: 'Perro herido en Corrientes',
  publicCode: 'C-1000',
  animalCondition: 'herido',
  seenAt: null,
  createdAt: new Date('2026-04-21T10:00:00Z'),
  updatedAt: new Date('2026-04-21T10:00:00Z'),
  resolvedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/cases', () => {
  it('crea un caso y devuelve 201', async () => {
    vi.mocked(svc.createCase).mockResolvedValueOnce(fakeCase);
    vi.mocked(svc.insertCaseImages).mockResolvedValueOnce();

    const res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', authHeader)
      .send({
        title: 'Perro herido en Corrientes',
        animalType: 'perro',
        description: 'Perro herido en la calle sin collar',
        location: { lat: -34.6037, lng: -58.3816 },
        urgencyLevel: 3,
      });

    expect(res.status).toBe(201);
    expect(res.body.case.id).toBe('case-uuid-1');
    expect(res.body.case.animalType).toBe('perro');
    expect(res.body.case.publicCode).toBe('C-1000');
  });

  it('pasa referenceNote y locationText al servicio como campos separados', async () => {
    vi.mocked(svc.createCase).mockResolvedValueOnce(fakeCase);
    vi.mocked(svc.insertCaseImages).mockResolvedValueOnce();

    const res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', authHeader)
      .send({
        title: 'Perro herido en Corrientes',
        animalType: 'perro',
        description: 'Perro herido en la calle sin collar',
        location: { lat: -34.6037, lng: -58.3816 },
        locationText: 'Av. Corrientes 1234',
        referenceNote: 'frente al kiosco',
      });

    expect(res.status).toBe(201);
    expect(vi.mocked(svc.createCase)).toHaveBeenCalledWith(
      'user-uuid-1',
      expect.objectContaining({
        locationText: 'Av. Corrientes 1234',
        referenceNote: 'frente al kiosco',
      }),
    );
  });

  it('devuelve 400 con referenceNote de mas de 255 caracteres', async () => {
    const res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', authHeader)
      .send({
        animalType: 'perro',
        description: 'Perro herido en la calle sin collar',
        location: { lat: -34.6037, lng: -58.3816 },
        referenceNote: 'x'.repeat(256),
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devuelve 400 con descripcion muy corta', async () => {
    const res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', authHeader)
      .send({
        animalType: 'perro',
        description: 'corta',
        location: { lat: -34.6037, lng: -58.3816 },
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devuelve 400 con animal_type invalido', async () => {
    const res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', authHeader)
      .send({
        animalType: 'dinosaurio',
        description: 'Descripcion suficientemente larga para pasar validacion',
        location: { lat: -34.6037, lng: -58.3816 },
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app)
      .post('/api/v1/cases')
      .send({ animalType: 'perro', description: 'Texto', location: { lat: 0, lng: 0 } });

    expect(res.status).toBe(401);
  });

  it('devuelve 403 con email no verificado', async () => {
    const res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', unverifiedHeader)
      .send({
        animalType: 'perro',
        description: 'Perro herido en la calle sin collar',
        location: { lat: -34.6037, lng: -58.3816 },
        urgencyLevel: 3,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  // verifyEmail marca la DB pero no reemite tokens: el access token sigue diciendo
  // false hasta 15 min despues de verificar. Sin el fallback a la DB, quien acaba de
  // verificar su email no puede publicar en esa ventana.
  it('publica con token viejo que dice no verificado si la DB dice que si', async () => {
    vi.mocked(db.User.findByPk).mockResolvedValueOnce({ emailVerified: true });
    vi.mocked(svc.createCase).mockResolvedValueOnce(fakeCase);
    vi.mocked(svc.insertCaseImages).mockResolvedValueOnce();

    const res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', unverifiedHeader)
      .send({
        title: 'Perro herido en Corrientes',
        animalType: 'perro',
        description: 'Perro herido en la calle sin collar',
        location: { lat: -34.6037, lng: -58.3816 },
        urgencyLevel: 3,
      });

    expect(res.status).toBe(201);
  });

  it('sigue devolviendo 403 si la DB tambien dice no verificado', async () => {
    vi.mocked(db.User.findByPk).mockResolvedValueOnce({ emailVerified: false });

    const res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', unverifiedHeader)
      .send({
        animalType: 'perro',
        description: 'Perro herido en la calle sin collar',
        location: { lat: -34.6037, lng: -58.3816 },
        urgencyLevel: 3,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });
});

describe('GET /api/v1/cases', () => {
  it('devuelve lista de casos con meta', async () => {
    vi.mocked(svc.listCases).mockResolvedValueOnce({ cases: [fakeCase], total: 1 });

    const res = await request(app).get('/api/v1/cases');

    expect(res.status).toBe(200);
    expect(res.body.cases).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
    expect(res.body.meta.page).toBe(1);
  });

  it('devuelve 400 con parametros invalidos', async () => {
    const res = await request(app).get('/api/v1/cases?lat=999');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/cases/nearby', () => {
  it('devuelve casos cercanos', async () => {
    vi.mocked(svc.getNearbyCases).mockResolvedValueOnce([
      { ...fakeCase, distanceKm: 0.5 },
    ]);

    const res = await request(app).get('/api/v1/cases/nearby?lat=-34.6&lng=-58.38&radius=5');

    expect(res.status).toBe(200);
    expect(res.body.cases).toHaveLength(1);
  });

  it('devuelve 400 sin lat/lng', async () => {
    const res = await request(app).get('/api/v1/cases/nearby');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/cases/:id', () => {
  it('devuelve detalle del caso con images y updates', async () => {
    vi.mocked(svc.getCaseById).mockResolvedValueOnce({
      ...fakeCase,
      images: [],
      updates: [],
    });

    const res = await request(app).get('/api/v1/cases/case-uuid-1');

    expect(res.status).toBe(200);
    expect(res.body.case.id).toBe('case-uuid-1');
    expect(res.body.case).toHaveProperty('images');
    expect(res.body.case).toHaveProperty('updates');
  });

  it('devuelve 404 para caso inexistente', async () => {
    vi.mocked(svc.getCaseById).mockResolvedValueOnce(null);

    const res = await request(app).get('/api/v1/cases/nonexistent-id');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CASE_NOT_FOUND');
  });
});

describe('PATCH /api/v1/cases/:id', () => {
  it('actualiza estado del caso', async () => {
    vi.mocked(svc.updateCase).mockResolvedValueOnce({
      ...fakeCase,
      status: 'en_rescate',
    });

    const res = await request(app)
      .patch('/api/v1/cases/case-uuid-1')
      .set('Authorization', authHeader)
      .send({ status: 'en_rescate' });

    expect(res.status).toBe(200);
    expect(res.body.case.status).toBe('en_rescate');
  });

  it('actualiza la referencia sin tocar la direccion', async () => {
    vi.mocked(svc.updateCase).mockResolvedValueOnce({
      ...fakeCase,
      referenceNote: 'frente al kiosco',
    });

    const res = await request(app)
      .patch('/api/v1/cases/case-uuid-1')
      .set('Authorization', authHeader)
      .send({ referenceNote: 'frente al kiosco' });

    expect(res.status).toBe(200);
    expect(vi.mocked(svc.updateCase)).toHaveBeenCalledWith(
      'case-uuid-1',
      'user-uuid-1',
      false,
      { referenceNote: 'frente al kiosco' },
    );
  });

  it('devuelve 400 con body vacio', async () => {
    const res = await request(app)
      .patch('/api/v1/cases/case-uuid-1')
      .set('Authorization', authHeader)
      .send({});

    expect(res.status).toBe(400);
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app)
      .patch('/api/v1/cases/case-uuid-1')
      .send({ status: 'en_rescate' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/cases/:id/updates', () => {
  it('agrega un update al caso', async () => {
    const fakeUpdate = {
      id: 'update-uuid-1',
      userId: 'user-uuid-1',
      updateType: 'comment',
      content: 'El perro fue asistido por veterinaria',
      hostName: null,
      createdAt: new Date(),
    };
    vi.mocked(svc.addCaseUpdate).mockResolvedValueOnce(fakeUpdate);

    const res = await request(app)
      .post('/api/v1/cases/case-uuid-1/updates')
      .set('Authorization', authHeader)
      .send({ updateType: 'comment', content: 'El perro fue asistido por veterinaria' });

    expect(res.status).toBe(201);
    expect(res.body.update.updateType).toBe('comment');
  });

  it('devuelve 400 con updateType invalido', async () => {
    const res = await request(app)
      .post('/api/v1/cases/case-uuid-1/updates')
      .set('Authorization', authHeader)
      .send({ updateType: 'invalid_type' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('acepta hostName en una novedad de alojamiento', async () => {
    const fakeUpdate = {
      id: 'update-uuid-2',
      userId: 'user-uuid-1',
      updateType: 'alojamiento',
      content: 'Lo tiene en su casa hasta el fin de semana',
      hostName: 'Marta Gimenez',
      createdAt: new Date(),
    };
    vi.mocked(svc.addCaseUpdate).mockResolvedValueOnce(fakeUpdate);

    const res = await request(app)
      .post('/api/v1/cases/case-uuid-1/updates')
      .set('Authorization', authHeader)
      .send({
        updateType: 'alojamiento',
        content: 'Lo tiene en su casa hasta el fin de semana',
        hostName: 'Marta Gimenez',
      });

    expect(res.status).toBe(201);
    expect(res.body.update.hostName).toBe('Marta Gimenez');
  });

  it('devuelve 400 si viene hostName en un tipo que no es alojamiento', async () => {
    const res = await request(app)
      .post('/api/v1/cases/case-uuid-1/updates')
      .set('Authorization', authHeader)
      .send({ updateType: 'salud', content: 'Mejoro mucho', hostName: 'Marta Gimenez' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

const fakeFeedCase = {
  id: 'feed-case-1',
  listingType: 'found',
  animalType: 'perro',
  locationText: 'Centro',
  urgencyLevel: 4,
  createdAt: new Date('2026-04-25T10:00:00Z'),
  publisherName: 'Maria',
  volunteerCount: 2,
};

describe('GET /api/v1/cases/feed', () => {
  it('devuelve casos del feed con lat/lng', async () => {
    vi.mocked(svc.getFeedCases).mockResolvedValueOnce([fakeFeedCase]);

    const res = await request(app).get('/api/v1/cases/feed?lat=-34.6&lng=-58.38');

    expect(res.status).toBe(200);
    expect(res.body.cases).toHaveLength(1);
    expect(res.body.cases[0].id).toBe('feed-case-1');
    expect(res.body.cases[0].publisherName).toBe('Maria');
  });

  it('expone el nombre de relleno tal cual lo devuelve el servicio', async () => {
    vi.mocked(svc.getFeedCases).mockResolvedValueOnce([
      { ...fakeFeedCase, publisherName: 'Usuario sin nombre' },
    ]);

    const res = await request(app).get('/api/v1/cases/feed?lat=-34.6&lng=-58.38');

    expect(res.status).toBe(200);
    expect(res.body.cases[0].publisherName).toBe('Usuario sin nombre');
  });

  it('devuelve 400 sin lat/lng', async () => {
    const res = await request(app).get('/api/v1/cases/feed');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devuelve 400 con lat fuera de rango', async () => {
    const res = await request(app).get('/api/v1/cases/feed?lat=999&lng=-58.38');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('filtra por listingType cuando se proporciona', async () => {
    vi.mocked(svc.getFeedCases).mockResolvedValueOnce([]);

    const res = await request(app).get('/api/v1/cases/feed?lat=-34.6&lng=-58.38&listingType=lost');

    expect(res.status).toBe(200);
    expect(svc.getFeedCases).toHaveBeenCalledWith(
      expect.objectContaining({ listingType: 'lost' }),
    );
  });

  it('devuelve 400 con listingType invalido', async () => {
    const res = await request(app).get('/api/v1/cases/feed?lat=-34.6&lng=-58.38&listingType=adopcion');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/cases — filtros de animal', () => {
  it('pasa filtros de sexo, tamaño y color al servicio', async () => {
    vi.mocked(svc.listCases).mockResolvedValueOnce({ cases: [fakeCase], total: 1 });

    const res = await request(app).get(
      '/api/v1/cases?animalSex=macho&animalSize=mediano&animalColor=negro',
    );

    expect(res.status).toBe(200);
    expect(svc.listCases).toHaveBeenCalledWith(
      expect.objectContaining({ animalSex: 'macho', animalSize: 'mediano', animalColor: 'negro' }),
    );
  });

  it('devuelve 400 con animalSex invalido', async () => {
    const res = await request(app).get('/api/v1/cases?animalSex=hermafrodita');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devuelve 400 con animalSize invalido', async () => {
    const res = await request(app).get('/api/v1/cases?animalSize=enorme');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devuelve 400 con animalColor invalido', async () => {
    const res = await request(app).get('/api/v1/cases?animalColor=rosa');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/cases/zone-stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve las metricas de la zona', async () => {
    vi.mocked(svc.getZoneStats).mockResolvedValue({
      activeCases: 12,
      resolvedThisMonth: 19,
      byUrgency: { critica: 1, alta: 1, media: 2, baja: 8 },
      byListingType: { found: 6, lost: 2 },
    });

    const res = await request(app)
      .get('/api/v1/cases/zone-stats')
      .query({ lat: -34.17, lng: -60.79, radius: 20 });

    expect(res.status).toBe(200);
    expect(res.body.activeCases).toBe(12);
    expect(res.body.byUrgency.critica).toBe(1);
    expect(vi.mocked(svc.getZoneStats)).toHaveBeenCalledWith({
      lat: -34.17,
      lng: -60.79,
      radius: 20,
    });
  });

  it('usa radio 10 por defecto', async () => {
    vi.mocked(svc.getZoneStats).mockResolvedValue({
      activeCases: 0,
      resolvedThisMonth: 0,
      byUrgency: { critica: 0, alta: 0, media: 0, baja: 0 },
      byListingType: { found: 0, lost: 0 },
    });

    await request(app).get('/api/v1/cases/zone-stats').query({ lat: -34.17, lng: -60.79 });

    expect(vi.mocked(svc.getZoneStats)).toHaveBeenCalledWith({
      lat: -34.17,
      lng: -60.79,
      radius: 10,
    });
  });

  it('rechaza sin coordenadas con el formato de error estandar', async () => {
    const res = await request(app).get('/api/v1/cases/zone-stats');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toHaveProperty('lat');
  });

  it('rechaza un radio fuera de rango', async () => {
    const res = await request(app)
      .get('/api/v1/cases/zone-stats')
      .query({ lat: -34.17, lng: -60.79, radius: 500 });

    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty('radius');
  });

  // La ruta se registra antes de /:id. Si se registrara despues, Express
  // tomaria "zone-stats" como un id de caso y devolveria 404 o 400.
  it('no la intercepta la ruta /:id', async () => {
    vi.mocked(svc.getZoneStats).mockResolvedValue({
      activeCases: 3,
      resolvedThisMonth: 0,
      byUrgency: { critica: 0, alta: 0, media: 3, baja: 0 },
      byListingType: { found: 3, lost: 0 },
    });

    const res = await request(app)
      .get('/api/v1/cases/zone-stats')
      .query({ lat: -34.17, lng: -60.79 });

    expect(res.status).toBe(200);
    expect(vi.mocked(svc.getCaseById)).not.toHaveBeenCalled();
  });
});
