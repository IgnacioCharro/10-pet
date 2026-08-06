process.env['JWT_SECRET'] = 'test-secret-that-is-at-least-32-characters-long';
process.env['DATABASE_URL'] = 'postgresql://localhost:5432/test';

import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';

import app from './app';

// El rate limiter se saltea cuando NODE_ENV es 'test' (ver skipInTest en app.ts), asi
// que para poder observarlo hay que apagar ese atajo mientras dura la prueba.
const conRateLimitActivo = async (fn: () => Promise<void>): Promise<void> => {
  const anterior = process.env['NODE_ENV'];
  process.env['NODE_ENV'] = 'production';
  try {
    await fn();
  } finally {
    process.env['NODE_ENV'] = anterior;
  }
};

// Una ruta inexistente atraviesa el limiter global igual que cualquier otra, pero
// responde 404 sin tocar la base.
const RUTA = '/api/v1/ruta-que-no-existe';

const pedir = (ip: string) => request(app).get(RUTA).set('X-Forwarded-For', ip);

describe('trust proxy', () => {
  afterEach(() => {
    process.env['NODE_ENV'] = 'test';
  });

  it('resuelve req.ip desde X-Forwarded-For en vez de la IP del proxy', () => {
    // Sin `trust proxy`, Express ignora el header y todos los visitantes comparten la
    // IP del proxy de Render.
    expect(app.get('trust proxy')).toBe(1);
  });

  it('cuenta el rate limit por IP real, no en un cupo compartido', async () => {
    await conRateLimitActivo(async () => {
      // El limiter global permite 60 por minuto. Agotamos el cupo de una IP.
      for (let i = 0; i < 60; i++) {
        const res = await pedir('203.0.113.10');
        expect(res.status).toBe(404);
      }

      // La 61 de esa misma IP ya cae.
      const excedida = await pedir('203.0.113.10');
      expect(excedida.status).toBe(429);

      // Pero otro visitante tiene su propio cupo: si esto diera 429, significaria que
      // un solo usuario puede dejar afuera a todos los demas.
      const otroVisitante = await pedir('198.51.100.20');
      expect(otroVisitante.status).toBe(404);
    });
  });

  it('no le cree a un X-Forwarded-For con varios saltos falsificados', async () => {
    await conRateLimitActivo(async () => {
      // Un atacante puede anteponer IPs inventadas al header. Con `trust proxy` en 1
      // solo se toma el ultimo salto (el que agrega Render), asi que las tres
      // requests caen en el mismo bucket y no sirven para multiplicar el cupo.
      for (let i = 0; i < 60; i++) {
        const res = await pedir(`10.0.0.${i % 250}, 192.0.2.77`);
        expect(res.status).toBe(404);
      }

      const excedida = await pedir('10.0.0.251, 192.0.2.77');
      expect(excedida.status).toBe(429);
    });
  });
});
