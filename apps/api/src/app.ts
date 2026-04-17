import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { healthRouter } from './routes/health.routes';

const app: Application = express();

// Seguridad y parsing
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

// Rutas
app.use('/api/v1', healthRouter);

export default app;
