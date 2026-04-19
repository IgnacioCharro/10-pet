import { Request, Response } from 'express';
import { createReportSchema, listReportsSchema, updateReportSchema } from './reports.validators';
import { createCaseReport, listReports, updateReport } from './reports.service';

export async function postCaseReport(req: Request, res: Response): Promise<void> {
  const parsed = createReportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', fields: parsed.error.flatten().fieldErrors },
    });
    return;
  }

  const result = await createCaseReport(req.user!.id, req.params.caseId, parsed.data);
  if ('error' in result) {
    res.status(result.error.status).json({ error: { code: result.error.code, message: result.error.message } });
    return;
  }

  res.status(204).end();
}

export async function getAdminReports(req: Request, res: Response): Promise<void> {
  const parsed = listReportsSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Parámetros inválidos', fields: parsed.error.flatten().fieldErrors },
    });
    return;
  }

  const result = await listReports(parsed.data);
  res.json(result);
}

export async function patchAdminReport(req: Request, res: Response): Promise<void> {
  const parsed = updateReportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', fields: parsed.error.flatten().fieldErrors },
    });
    return;
  }

  const result = await updateReport(req.params.id, parsed.data);
  if ('error' in result) {
    res.status(result.error.status).json({ error: { code: result.error.code, message: result.error.message } });
    return;
  }

  res.json(result);
}
