import { Router } from 'express';
import { register, login, refresh, logout } from './auth.controller';

export const authRouter: Router = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
