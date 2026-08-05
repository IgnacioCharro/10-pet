import { describe, it, expect } from 'vitest';
import { pickGoogleName } from './auth.google-profile';

describe('auth.google-profile', () => {
  describe('pickGoogleName', () => {
    it('prefiere displayName', () => {
      expect(pickGoogleName({ displayName: 'Maria Lopez' })).toBe('Maria Lopez');
    });

    it('compone givenName + familyName cuando displayName viene vacio', () => {
      expect(
        pickGoogleName({
          displayName: '   ',
          name: { givenName: 'Maria', familyName: 'Lopez' },
        }),
      ).toBe('Maria Lopez');
    });

    it('acepta solo givenName', () => {
      expect(pickGoogleName({ name: { givenName: 'Maria' } })).toBe('Maria');
    });

    it('devuelve null cuando el perfil no trae nombre', () => {
      expect(pickGoogleName({})).toBeNull();
    });

    it('nunca saca el nombre del email', () => {
      // El perfil real de Google trae emails; el nombre nunca sale de ahi.
      const profile: Parameters<typeof pickGoogleName>[0] & {
        emails: { value: string }[];
      } = { emails: [{ value: 'maria@gmail.com' }] };
      expect(pickGoogleName(profile)).toBeNull();
    });
  });
});
