import { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Autenticación requerida' } });
    return;
  }
  // Read at runtime so tests can set process.env.ADMIN_EMAILS before each request
  const adminEmails = new Set(
    (process.env['ADMIN_EMAILS'] ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
  if (!adminEmails.has(req.user.email.toLowerCase())) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Acceso de administrador requerido' } });
    return;
  }
  next();
}
