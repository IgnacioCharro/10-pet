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

const app: Application = express();

const globalLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });
const mutationLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

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

Sentry.setupExpressErrorHandler(app);

export default app;
