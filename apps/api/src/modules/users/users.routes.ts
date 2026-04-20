import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { getMe, patchMe, getMyCases, savePushToken } from './users.controller';

export const usersRouter: Router = Router();

usersRouter.get('/me', requireAuth, getMe);
usersRouter.patch('/me', requireAuth, patchMe);
usersRouter.get('/me/cases', requireAuth, getMyCases);
usersRouter.post('/me/push-token', requireAuth, savePushToken);
