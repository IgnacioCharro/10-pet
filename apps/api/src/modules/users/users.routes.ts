import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { getMe } from './users.controller';

export const usersRouter: Router = Router();

usersRouter.get('/me', requireAuth, getMe);
