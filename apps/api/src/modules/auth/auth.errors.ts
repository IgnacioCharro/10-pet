export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 401,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export const emailAlreadyRegistered = (): AuthError =>
  new AuthError('EMAIL_ALREADY_REGISTERED', 'El email ya esta registrado', 409);

export const invalidCredentials = (): AuthError =>
  new AuthError('INVALID_CREDENTIALS', 'Credenciales invalidas', 401);

export const invalidRefreshToken = (): AuthError =>
  new AuthError('INVALID_REFRESH_TOKEN', 'Refresh token invalido o expirado', 401);

export const missingToken = (): AuthError =>
  new AuthError('MISSING_TOKEN', 'Token de acceso requerido', 401);

export const invalidAccessToken = (): AuthError =>
  new AuthError('INVALID_ACCESS_TOKEN', 'Token de acceso invalido o expirado', 401);

export const invalidVerificationToken = (): AuthError =>
  new AuthError('INVALID_VERIFICATION_TOKEN', 'Token de verificacion invalido o expirado', 400);

export const googleOAuthError = (): AuthError =>
  new AuthError('GOOGLE_OAUTH_ERROR', 'Error al autenticar con Google', 502);
