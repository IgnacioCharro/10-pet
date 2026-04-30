import { Router, IRouter } from 'express';
import { requireAuth } from '../../../middleware/require-auth';
import { requireAdmin } from '../../../middleware/require-admin';
import { getStats, getUsers, patchUser, patchCase, getCases } from './admin.controller';

export const adminRouter: IRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/stats', getStats);
adminRouter.get('/users', getUsers);
adminRouter.patch('/users/:id', patchUser);
adminRouter.get('/cases', getCases);
adminRouter.patch('/cases/:id', patchCase);
