import { Router, Request, Response } from 'express';
import { sequelize } from '../db';

export const healthRouter: Router = Router();

healthRouter.get('/health', async (_req: Request, res: Response) => {
  let db: 'ok' | 'error' = 'ok';
  try {
    await sequelize.authenticate();
  } catch {
    db = 'error';
  }

  res.json({
    status: db === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env['NODE_ENV'] ?? 'development',
    db,
  });
});
