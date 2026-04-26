import { Router, type IRouter } from 'express';
import { requireAuth } from '../../../middleware/require-auth';
import { listVetAssistances, postVetAssistance } from './vet-assistances.controller';

export const vetAssistancesRouter: IRouter = Router({ mergeParams: true });

vetAssistancesRouter.get('/', listVetAssistances);
vetAssistancesRouter.post('/', requireAuth, postVetAssistance);
