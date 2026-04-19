import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, refreshSchema } from './auth.validators';

describe('auth.validators', () => {
  describe('registerSchema', () => {
    it('acepta email + password validos y normaliza email', () => {
      const r = registerSchema.parse({
        email: '  Foo@Bar.COM  ',
        password: 'secret12',
      });
      expect(r.email).toBe('foo@bar.com');
      expect(r.password).toBe('secret12');
    });

    it('rechaza passwords cortas', () => {
      expect(() =>
        registerSchema.parse({ email: 'a@b.com', password: '123' }),
      ).toThrow();
    });

    it('rechaza emails invalidos', () => {
      expect(() =>
        registerSchema.parse({ email: 'notanemail', password: 'password1' }),
      ).toThrow();
    });
  });

  describe('loginSchema', () => {
    it('normaliza email y exige password no vacia', () => {
      const r = loginSchema.parse({ email: 'A@B.COM', password: 'x' });
      expect(r.email).toBe('a@b.com');
    });
  });

  describe('refreshSchema', () => {
    it('exige refreshToken presente', () => {
      expect(() => refreshSchema.parse({ refreshToken: '' })).toThrow();
      expect(refreshSchema.parse({ refreshToken: 'abc' }).refreshToken).toBe('abc');
    });
  });
});
