import { describe, it, expect } from 'vitest';
import { PUBLISHER_FALLBACK_NAME, resolvePublisherName } from './cases.publisher';

describe('cases.publisher', () => {
  describe('resolvePublisherName', () => {
    it('devuelve el nombre tal cual cuando tiene contenido', () => {
      expect(resolvePublisherName('Maria')).toBe('Maria');
    });

    it('recorta los espacios de los extremos', () => {
      expect(resolvePublisherName('  Maria Lopez  ')).toBe('Maria Lopez');
    });

    it('cae al relleno con null, undefined, cadena vacia o solo espacios', () => {
      expect(resolvePublisherName(null)).toBe(PUBLISHER_FALLBACK_NAME);
      expect(resolvePublisherName(undefined)).toBe(PUBLISHER_FALLBACK_NAME);
      expect(resolvePublisherName('')).toBe(PUBLISHER_FALLBACK_NAME);
      expect(resolvePublisherName('   ')).toBe(PUBLISHER_FALLBACK_NAME);
    });
  });

  describe('PUBLISHER_FALLBACK_NAME', () => {
    it('nunca puede ser un email ni un hueco', () => {
      expect(PUBLISHER_FALLBACK_NAME).not.toContain('@');
      expect(PUBLISHER_FALLBACK_NAME).not.toBe('');
    });
  });
});
