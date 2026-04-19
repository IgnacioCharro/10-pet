import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} from './auth.validators';
import {
  registerUser,
  loginUser,
  rotateRefreshToken,
  revokeRefreshToken,
  verifyEmail,
  findOrCreateGoogleUser,
} from './auth.service';
import { AuthError, googleOAuthError } from './auth.errors';
import { env } from '../../config/env';

const handleError = (err: unknown, res: Response, next: NextFunction): void => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos de entrada invalidos',
        fields: err.flatten().fieldErrors,
      },
    });
    return;
  }
  if (err instanceof AuthError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }
  next(err);
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const input = registerSchema.parse(req.body);
    const result = await registerUser(input);
    res.status(201).json(result);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await loginUser(input);
    res.status(200).json(result);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const input = refreshSchema.parse(req.body);
    const tokens = await rotateRefreshToken(input.refreshToken);
    res.status(200).json(tokens);
  } catch (err) {
    handleError(err, res, next);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const input = logoutSchema.parse(req.body);
    await revokeRefreshToken(input.refreshToken);
    res.status(204).send();
  } catch (err) {
    handleError(err, res, next);
  }
};

export const verifyEmailHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = String(req.query['token'] ?? '');
    if (!token) {
      res.status(400).json({ error: { code: 'MISSING_TOKEN', message: 'Token requerido' } });
      return;
    }
    await verifyEmail(token);
    res.redirect(`${env.WEB_BASE_URL}/auth/verified`);
  } catch (err) {
    if (err instanceof AuthError) {
      res.redirect(`${env.WEB_BASE_URL}/auth/verified?error=${err.code}`);
      return;
    }
    next(err);
  }
};

export const googleCallbackHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const profile = req.user as {
      id: string;
      email: string;
      emailVerified: boolean;
    } | undefined;

    if (!profile) {
      throw googleOAuthError();
    }

    const result = await findOrCreateGoogleUser(profile);
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    res.redirect(`${env.WEB_BASE_URL}/auth/callback?${params.toString()}`);
  } catch (err) {
    if (err instanceof AuthError) {
      res.redirect(`${env.WEB_BASE_URL}/auth/callback?error=${err.code}`);
      return;
    }
    next(err);
  }
};
