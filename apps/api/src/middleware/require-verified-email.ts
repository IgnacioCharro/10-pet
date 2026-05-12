import { Request, Response, NextFunction } from 'express';

export const requireVerifiedEmail = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user?.emailVerified) {
    res.status(403).json({
      error: {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Debés verificar tu email antes de realizar esta acción.',
      },
    });
    return;
  }
  next();
};
