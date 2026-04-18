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
} from './auth.service';
import { AuthError } from './auth.errors';

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
