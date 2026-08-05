// Display name of whoever published a case. No imports on purpose: this module
// only resolves a name, so it stays testable without touching the DB.

// Shown when the publisher has no name stored — Google sign-ups did not save one
// until now. Fixed literal, in Spanish, derived from no user data at all: never
// the email, nor any part of it.
export const PUBLISHER_FALLBACK_NAME = 'Usuario sin nombre';

// Trims like registerSchema and patchMeSchema already do, so a name saved as
// ' Maria ' reads 'Maria'. Null, undefined, empty and whitespace-only all mean
// the same thing here: there is no name to show.
export function resolvePublisherName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return PUBLISHER_FALLBACK_NAME;
  return trimmed;
}
