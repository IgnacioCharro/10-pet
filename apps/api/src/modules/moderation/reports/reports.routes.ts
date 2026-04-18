import { Router, IRouter } from 'express';
import { requireAuth } from '../../../middleware/require-auth';
import { requireAdmin } from '../../../middleware/require-admin';
import { postCaseReport, getAdminReports, patchAdminReport } from './reports.controller';

// Mounted under /api/v1/cases/:caseId/report and /api/v1/admin
export const caseReportRouter: IRouter = Router({ mergeParams: true });
export const adminReportsRouter: IRouter = Router();

caseReportRouter.post('/', requireAuth, postCaseReport);

adminReportsRouter.get('/', requireAuth, requireAdmin, getAdminReports);
adminReportsRouter.patch('/:id', requireAuth, requireAdmin, patchAdminReport);
