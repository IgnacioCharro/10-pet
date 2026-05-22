import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { getMe, patchMe, getMyCases, savePushToken, patchNotificationLocation, deleteNotificationLocation, getUserById } from './users.controller';

export const usersRouter: Router = Router();

usersRouter.get('/me', requireAuth, getMe);
usersRouter.patch('/me', requireAuth, patchMe);
usersRouter.patch('/me/notification-location', requireAuth, patchNotificationLocation);
usersRouter.delete('/me/notification-location', requireAuth, deleteNotificationLocation);
usersRouter.get('/me/cases', requireAuth, getMyCases);
usersRouter.post('/me/push-token', requireAuth, savePushToken);
usersRouter.get('/:id', getUserById);
