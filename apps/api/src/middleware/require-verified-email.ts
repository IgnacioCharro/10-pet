import { Request, Response, NextFunction } from 'express';
import { User } from '../db';

export const requireVerifiedEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (req.user?.emailVerified) {
    next();
    return;
  }

  // El claim del JWT es un cache: verifyEmail marca la DB pero no reemite tokens,
  // asi que el access token sigue diciendo false hasta 15 min despues de verificar.
  // Antes de rechazar, preguntarle a la DB, que es la fuente de verdad.
  if (req.user?.id) {
    try {
      const user = await User.findByPk(req.user.id, { attributes: ['emailVerified'] });
      if (user?.emailVerified) {
        req.user.emailVerified = true;
        next();
        return;
      }
    } catch (err) {
      // Express 4 no captura rechazos de middleware async: sin esto la request cuelga
      next(err);
      return;
    }
  }

  res.status(403).json({
    error: {
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Debés verificar tu email antes de realizar esta acción.',
    },
  });
};
