import { Request, Response, NextFunction } from 'express';
import { User } from '../../db';

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findByPk(req.user!.id, {
      attributes: ['id', 'email', 'emailVerified', 'createdAt'],
    });
    if (!user) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' } });
      return;
    }
    res.json({ id: user.id, email: user.email, emailVerified: user.emailVerified, createdAt: user.createdAt });
  } catch (err) {
    next(err);
  }
};
