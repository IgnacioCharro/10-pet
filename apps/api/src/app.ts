import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import passport from 'passport';
import { env } from './config/env';
import { healthRouter } from './routes/health.routes';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { casesRouter } from './modules/rescue/cases/cases.routes';

const app: Application = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use(passport.initialize());

// Rutas
app.use('/api/v1', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/cases', casesRouter);

export default app;
