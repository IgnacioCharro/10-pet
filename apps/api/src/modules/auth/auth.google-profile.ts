// Nombre a guardar cuando alguien se da de alta con Google. Sin imports a
// proposito: solo lee los campos del perfil que entrega passport, asi que se
// testea sin OAuth. Nunca mira profile.emails — un email no es un nombre.

// passport-google-oauth20 tipa displayName como siempre presente, pero puede
// llegar vacio: por eso cadena vacia y solo-espacios cuentan como ausencia.
export function pickGoogleName(profile: {
  displayName?: string;
  name?: { givenName?: string; familyName?: string };
}): string | null {
  const displayName = profile.displayName?.trim();
  if (displayName) return displayName;

  const composed = [profile.name?.givenName, profile.name?.familyName]
    .join(' ')
    .trim();
  if (!composed) return null;
  return composed;
}
