import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  createCaseSchema,
  listCasesSchema,
  nearbyCasesSchema,
  feedCasesSchema,
  updateCaseSchema,
  addUpdateSchema,
} from './cases.validators';
import {
  createCase,
  insertCaseImages,
  listCases,
  getNearbyCases,
  getFeedCases,
  getCaseById,
  updateCase,
  addCaseUpdate,
} from './cases.service';

class CaseError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

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
  if (err instanceof CaseError || (err as CaseError).code) {
    const e = err as CaseError;
    res.status(e.status ?? 400).json({ error: { code: e.code, message: e.message } });
    return;
  }
  next(err);
}

export async function postCase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createCaseSchema.parse(req.body);
    const userId = req.user!.id;

    const newCase = await createCase(userId, input);

    if (input.imageIds && input.imageIds.length > 0) {
      const cloudName = process.env['CLOUDINARY_CLOUD_NAME'] ?? 'placeholder';
      await insertCaseImages(
        newCase.id,
        input.imageIds.map((publicId, idx) => ({
          cloudinaryUrl: `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${publicId}`,
          cloudinaryPublicId: publicId,
          position: idx,
        })),
      );
    }

    res.status(201).json({ case: newCase });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function getCases(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = listCasesSchema.parse(req.query);
    const { cases, total } = await listCases(query);
    const { page, limit } = query;

    res.json({
      cases,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function getFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = feedCasesSchema.parse(req.query);
    const cases = await getFeedCases(query);
    res.json({ cases });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function getNearby(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = nearbyCasesSchema.parse(req.query);
    const cases = await getNearbyCases(query);
    res.json({ cases });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function getCase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const caseDetail = await getCaseById(id);

    if (!caseDetail) {
      res.status(404).json({ error: { code: 'CASE_NOT_FOUND', message: 'Caso no encontrado' } });
      return;
    }

    // Never expose phone_contact in GET /cases/:id — only via POST /contacts
    const { ...safeCase } = caseDetail;

    res.json({ case: safeCase });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function patchCase(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const input = updateCaseSchema.parse(req.body);
    const userId = req.user!.id;

    const updated = await updateCase(id, userId, false, input);
    if (!updated) {
      res.status(404).json({ error: { code: 'CASE_NOT_FOUND', message: 'Caso no encontrado' } });
      return;
    }

    res.json({ case: updated });
  } catch (err) {
    handleError(err, res, next);
  }
}

export async function postCaseUpdate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const input = addUpdateSchema.parse(req.body);
    const userId = req.user!.id;

    const update = await addCaseUpdate(id, userId, input);
    res.status(201).json({ update });
  } catch (err) {
    handleError(err, res, next);
  }
}
