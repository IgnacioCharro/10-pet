import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { signUploadSchema } from './images.validators';
import { generateUploadSignature } from '../../services/image.service';

export async function postSignUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { folder } = signUploadSchema.parse(req.body);
    const signature = generateUploadSignature(folder);
    res.json(signature);
  } catch (err) {
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
}
