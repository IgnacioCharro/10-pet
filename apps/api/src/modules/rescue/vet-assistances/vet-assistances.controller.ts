import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createVetAssistanceSchema } from './vet-assistances.validators';
import { getVetAssistances, createVetAssistance } from './vet-assistances.service';

function handleError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos de entrada invalidos',
        fields: err.flatten().fieldErrors,
      },
    });
    return;
  }
  next(err);
}

export async function listVetAssistances(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { caseId } = req.params;
    const assistances = await getVetAssistances(caseId);
    res.json({ assistances });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function postVetAssistance(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { caseId } = req.params;
    const userId = req.user!.id;
    const input = createVetAssistanceSchema.parse(req.body);
    const assistance = await createVetAssistance(caseId, userId, input);
    res.status(201).json({ assistance });
  } catch (err) {
    handleError(err, res, next);
  }
}
