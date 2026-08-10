import { Router, IRouter } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { requireAdmin } from '../../middleware/require-admin';
import { postImprovement } from './improvements.controller';

// Bandeja de mejoras del admin. No reemplaza al feedback de testers (routes/feedback.routes.ts),
// que sigue siendo público y sigue yendo por mail.
export const improvementsRouter: IRouter = Router();

improvementsRouter.post('/', requireAuth, requireAdmin, postImprovement);
