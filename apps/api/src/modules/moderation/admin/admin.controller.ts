import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  listUsersSchema,
  patchAdminUserSchema,
  patchAdminCaseSchema,
} from './admin.validators';
import {
  getAdminStats,
  listAdminUsers,
  banUser,
  patchAdminCase,
} from './admin.service';

export const getStats = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = listUsersSchema.parse(req.query);
    const result = await listAdminUsers(query);
    res.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Parametros invalidos', fields: err.flatten().fieldErrors },
      });
      return;
    }
    next(err);
  }
};

export const patchUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const input = patchAdminUserSchema.parse(req.body);
    const result = await banUser(req.params['id']!, input);
    if ('error' in result) {
      res.status(result.error.status).json({ error: { code: result.error.code, message: result.error.message } });
      return;
    }
    res.status(204).end();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Datos invalidos', fields: err.flatten().fieldErrors },
      });
      return;
    }
    next(err);
  }
};

export const patchCase = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const input = patchAdminCaseSchema.parse(req.body);
    const result = await patchAdminCase(req.params['id']!, input);
    if ('error' in result) {
      res.status(result.error.status).json({ error: { code: result.error.code, message: result.error.message } });
      return;
    }
    res.status(204).end();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Datos invalidos', fields: err.flatten().fieldErrors },
      });
      return;
    }
    next(err);
  }
};
