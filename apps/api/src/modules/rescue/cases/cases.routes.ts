import { Router } from 'express';
import { requireAuth } from '../../../middleware/require-auth';
import {
  postCase,
  getCases,
  getNearby,
  getCase,
  patchCase,
  postCaseUpdate,
} from './cases.controller';

export const casesRouter: Router = Router();

// Public routes
casesRouter.get('/', getCases);
casesRouter.get('/nearby', getNearby);
casesRouter.get('/:id', getCase);

// Authenticated routes
casesRouter.post('/', requireAuth, postCase);
casesRouter.patch('/:id', requireAuth, patchCase);
casesRouter.post('/:id/updates', requireAuth, postCaseUpdate);
