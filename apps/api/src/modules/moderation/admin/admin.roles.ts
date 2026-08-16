/**
 * Reglas de rol, sin base de datos ni Express.
 *
 * Viven aparte porque las suites de integracion de este repo mockean
 * `../../../db`: si estas reglas vivieran solo en el service, ningun test las
 * ejecutaria de verdad. Mismo patron que `cases.ordering.ts`.
 */

// Espejo del CHECK users_role_check. Sumar un valor aca sin la migration
// correspondiente hace que el update rebote contra el constraint (23514).
export const USER_ROLES = ['comun', 'tester', 'voluntario', 'veterinario', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

/**
 * `is_vet` pasa a ser derivado del rol: el panel es el unico que lo escribe.
 * Los dos campos no pueden divergir.
 */
export function isVetForRole(role: UserRole): boolean {
  return role === 'veterinario';
}

/**
 * El permiso de admin sale de ADMIN_EMAILS, no de la columna `role`. Se recibe
 * el valor crudo para que la regla sea testeable sin tocar process.env.
 */
export function isAdminEmail(email: string, rawAdminEmails: string | undefined): boolean {
  if (!email) return false;
  const admins = new Set(
    (rawAdminEmails ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
  return admins.has(email.toLowerCase());
}
