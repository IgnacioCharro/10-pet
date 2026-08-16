import { describe, it, expect } from 'vitest';
import { USER_ROLES, isVetForRole, isAdminEmail } from './admin.roles';

describe('USER_ROLES', () => {
  it('tiene los cinco roles en orden', () => {
    expect(USER_ROLES).toEqual(['comun', 'tester', 'voluntario', 'veterinario', 'admin']);
  });
});

describe('isVetForRole', () => {
  it('solo veterinario da true', () => {
    expect(isVetForRole('veterinario')).toBe(true);
  });

  it('cualquier otro rol da false', () => {
    for (const role of ['comun', 'tester', 'voluntario', 'admin'] as const) {
      expect(isVetForRole(role)).toBe(false);
    }
  });
});

describe('isAdminEmail', () => {
  it('reconoce un email de la lista sin importar mayusculas ni espacios', () => {
    expect(isAdminEmail('Admin@Ejemplo.com', ' admin@ejemplo.com , otro@ejemplo.com ')).toBe(true);
  });

  it('devuelve false para un email que no esta', () => {
    expect(isAdminEmail('otro@ejemplo.com', 'admin@ejemplo.com')).toBe(false);
  });

  it('devuelve false con la variable vacia o sin definir', () => {
    expect(isAdminEmail('admin@ejemplo.com', '')).toBe(false);
    expect(isAdminEmail('admin@ejemplo.com', undefined)).toBe(false);
  });

  it('no toma la cadena vacia entre comas como un email', () => {
    expect(isAdminEmail('', 'admin@ejemplo.com,,')).toBe(false);
  });
});
