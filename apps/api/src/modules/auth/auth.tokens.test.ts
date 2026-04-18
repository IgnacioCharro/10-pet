import { describe, it, expect, beforeAll } from 'vitest';

process.env['JWT_SECRET'] =
  process.env['JWT_SECRET'] ?? 'test-secret-that-is-at-least-32-characters-long';
process.env['JWT_ACCESS_EXPIRES'] = '15m';
process.env['JWT_REFRESH_EXPIRES'] = '7d';
process.env['DATABASE_URL'] =
  process.env['DATABASE_URL'] ?? 'postgresql://localhost:5432/test';

let tokens: typeof import('./auth.tokens');

beforeAll(async () => {
  tokens = await import('./auth.tokens');
});

describe('auth.tokens', () => {
  describe('signAccessToken / verifyAccessToken', () => {
    it('firma y verifica un token con sub y email', () => {
      const token = tokens.signAccessToken({
        sub: 'user-123',
        email: 'foo@bar.com',
      });
      const payload = tokens.verifyAccessToken(token);
      expect(payload.sub).toBe('user-123');
      expect(payload.email).toBe('foo@bar.com');
    });

    it('rechaza un token modificado', () => {
      const token = tokens.signAccessToken({ sub: 'u', email: 'e@e.com' });
      const tampered = token.slice(0, -1) + (token.slice(-1) === 'a' ? 'b' : 'a');
      expect(() => tokens.verifyAccessToken(tampered)).toThrow();
    });
  });

  describe('generateRefreshToken / hashRefreshToken', () => {
    it('genera tokens distintos cada vez', () => {
      const a = tokens.generateRefreshToken();
      const b = tokens.generateRefreshToken();
      expect(a).not.toBe(b);
      expect(a).toMatch(/^[0-9a-f]+$/);
      expect(a.length).toBeGreaterThanOrEqual(64);
    });

    it('hashea de forma determinista', () => {
      const t = 'some-token-value';
      expect(tokens.hashRefreshToken(t)).toBe(tokens.hashRefreshToken(t));
    });

    it('produce hashes distintos para tokens distintos', () => {
      expect(tokens.hashRefreshToken('a')).not.toBe(tokens.hashRefreshToken('b'));
    });
  });

  describe('parseDurationToMs', () => {
    it('parsea segundos, minutos, horas, dias', () => {
      expect(tokens.parseDurationToMs('30s')).toBe(30_000);
      expect(tokens.parseDurationToMs('15m')).toBe(15 * 60_000);
      expect(tokens.parseDurationToMs('2h')).toBe(2 * 60 * 60_000);
      expect(tokens.parseDurationToMs('7d')).toBe(7 * 24 * 60 * 60_000);
    });

    it('tira error en formato invalido', () => {
      expect(() => tokens.parseDurationToMs('abc')).toThrow();
      expect(() => tokens.parseDurationToMs('10')).toThrow();
    });
  });

  describe('refreshExpiresAt', () => {
    it('devuelve un Date en el futuro', () => {
      const exp = tokens.refreshExpiresAt();
      expect(exp.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
