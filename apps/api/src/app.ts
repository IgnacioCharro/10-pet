import * as Sentry from '@sentry/node';
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { env } from './config/env';
import { healthRouter } from './routes/health.routes';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { casesRouter } from './modules/rescue/cases/cases.routes';
import { contactsRouter } from './modules/rescue/contacts/contacts.routes';
import { caseReportRouter, adminReportsRouter } from './modules/moderation/reports/reports.routes';
import { adminRouter } from './modules/moderation/admin/admin.routes';
import { imagesRouter } from './modules/images/images.routes';
import { vetAssistancesRouter } from './modules/rescue/vet-assistances/vet-assistances.routes';
import { feedbackRouter } from './routes/feedback.routes';
import { improvementsRouter } from './modules/improvements/improvements.routes';

const app: Application = express();

// Detras del proxy de Render, la conexion TCP viene del proxy y no del visitante, asi
// que sin esto `req.ip` es la misma para todo el mundo y el rate limit pasa a ser un
// cupo unico compartido en vez de uno por IP.
//
// El valor es 1 ("confiar solo en el primer proxy"), no `true`. Con `true` Express le
// cree a cualquier X-Forwarded-For, y como ese header lo manda el cliente, alcanza con
// falsear una IP distinta por request para caer siempre en un bucket nuevo y anular el
// rate limit por completo.
app.set('trust proxy', 1);

const skipInTest = () => process.env['NODE_ENV'] === 'test';
const globalLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false, skip: skipInTest });
const mutationLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false, skip: skipInTest });

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use(passport.initialize());
app.use(globalLimiter);

// Rutas
app.use('/api/v1', healthRouter);
app.use('/api/v1/auth', mutationLimiter, authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/cases', casesRouter);
app.use('/api/v1/cases/:caseId/report', mutationLimiter, caseReportRouter);
app.use('/api/v1/contacts', contactsRouter);
app.use('/api/v1/admin/reports', adminReportsRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/images', mutationLimiter, imagesRouter);
app.use('/api/v1/cases/:caseId/vet-assistances', vetAssistancesRouter);
app.use('/api/v1/feedback', mutationLimiter, feedbackRouter);
app.use('/api/v1/improvements', mutationLimiter, improvementsRouter);

Sentry.setupExpressErrorHandler(app);

export default app;
