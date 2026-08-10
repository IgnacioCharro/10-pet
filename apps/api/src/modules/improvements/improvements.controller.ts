import { Request, Response } from 'express';
import { createImprovementSchema } from './improvements.validators';
import { createImprovement } from './improvements.service';

export async function postImprovement(req: Request, res: Response): Promise<void> {
  const parsed = createImprovementSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        fields: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  await createImprovement(req.user!.id, parsed.data);
  res.status(204).end();
}
