import { Router, Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { optionalAuth } from '../middleware/require-auth';
import { sendEmail } from '../services/email.service';
import { env } from '../config/env';

export const feedbackRouter: Router = Router();

const feedbackSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

feedbackRouter.post('/', optionalAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { message } = feedbackSchema.parse(req.body);

    const adminEmail = env.ADMIN_EMAILS.split(',').map((e) => e.trim()).filter(Boolean)[0];
    if (!adminEmail) {
      res.status(204).end();
      return;
    }

    const user = req.user;
    const from = user ? user.email : 'Usuario no registrado';

    await sendEmail({
      to: adminEmail,
      subject: '[10_Pet] Feedback de tester',
      text: `De: ${from}\n\n${message}`,
      html: `<p><strong>De:</strong> ${from}</p><br><p>${message.replace(/\n/g, '<br>')}</p>`,
    });

    res.status(204).end();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Mensaje requerido' } });
      return;
    }
    next(err);
  }
});
