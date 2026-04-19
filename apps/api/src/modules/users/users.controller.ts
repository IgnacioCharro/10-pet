import { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { User, Case } from '../../db';

const patchMeSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
});

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findByPk(req.user!.id, {
      attributes: ['id', 'email', 'name', 'emailVerified', 'createdAt'],
    });
    if (!user) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' } });
      return;
    }
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
};

export const patchMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const input = patchMeSchema.parse(req.body);
    const user = await User.findByPk(req.user!.id);
    if (!user) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' } });
      return;
    }
    if (input.name !== undefined) user.name = input.name;
    await user.save();
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    });
  } catch (err) {
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
    next(err);
  }
};

export const getMyCases = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const cases = await Case.findAll({
      where: { userId: req.user!.id },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json({ cases });
  } catch (err) {
    next(err);
  }
};
