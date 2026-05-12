import { Router } from 'express';
import { requireAuth } from '../../../middleware/require-auth';
import { requireVerifiedEmail } from '../../../middleware/require-verified-email';
import {
  postCase,
  getCases,
  getNearby,
  getFeed,
  getCase,
  patchCase,
  postCaseUpdate,
} from './cases.controller';

export const casesRouter: Router = Router();

// Public routes
casesRouter.get('/', getCases);
casesRouter.get('/nearby', getNearby);
casesRouter.get('/feed', getFeed);
casesRouter.get('/:id', getCase);

// Authenticated + email verified routes
casesRouter.post('/', requireAuth, requireVerifiedEmail, postCase);
casesRouter.patch('/:id', requireAuth, requireVerifiedEmail, patchCase);
casesRouter.post('/:id/updates', requireAuth, requireVerifiedEmail, postCaseUpdate);
