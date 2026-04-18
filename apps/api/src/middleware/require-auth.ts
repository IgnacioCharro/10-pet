import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../modules/auth/auth.tokens';
import { invalidAccessToken, missingToken, AuthError } from '../modules/auth/auth.errors';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw missingToken();
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw missingToken();
    }
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    const authErr = err instanceof AuthError ? err : invalidAccessToken();
    res.status(authErr.status).json({
      error: { code: authErr.code, message: authErr.message },
    });
  }
};
