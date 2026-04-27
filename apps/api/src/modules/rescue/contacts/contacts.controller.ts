import { Request, Response } from 'express';
import {
  createContactSchema,
  listContactsSchema,
  updateContactSchema,
  unreadCountSchema,
} from './contacts.validators';
import {
  createContact,
  listContacts,
  getContactById,
  updateContact,
  getPendingCount,
  getUnreadUpdatesCount,
} from './contacts.service';

export async function postContact(req: Request, res: Response): Promise<void> {
  const parsed = createContactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', fields: parsed.error.flatten().fieldErrors },
    });
    return;
  }

  const result = await createContact(req.user!.id, parsed.data);
  if ('error' in result) {
    res.status(result.error.status).json({ error: { code: result.error.code, message: result.error.message } });
    return;
  }

  res.status(201).json(result);
}

export async function getContacts(req: Request, res: Response): Promise<void> {
  const parsed = listContactsSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Parámetros inválidos', fields: parsed.error.flatten().fieldErrors },
    });
    return;
  }

  const result = await listContacts(req.user!.id, parsed.data);
  res.json(result);
}

export async function getContact(req: Request, res: Response): Promise<void> {
  const result = await getContactById(req.params.id, req.user!.id);
  if (!result) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Contacto no encontrado' } });
    return;
  }
  if ('error' in result) {
    res.status(result.error.status).json({ error: { code: result.error.code, message: result.error.message } });
    return;
  }
  res.json(result);
}

export async function getPendingContactsCount(req: Request, res: Response): Promise<void> {
  const count = await getPendingCount(req.user!.id);
  res.json({ count });
}

export async function getUnreadContactsCount(req: Request, res: Response): Promise<void> {
  const parsed = unreadCountSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Parámetros inválidos' } });
    return;
  }
  const since = parsed.data.since ? new Date(parsed.data.since) : new Date(0);
  const count = await getUnreadUpdatesCount(req.user!.id, since);
  res.json({ count });
}

export async function patchContact(req: Request, res: Response): Promise<void> {
  const parsed = updateContactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', fields: parsed.error.flatten().fieldErrors },
    });
    return;
  }

  const result = await updateContact(req.params.id, req.user!.id, parsed.data);
  if ('error' in result) {
    res.status(result.error.status).json({ error: { code: result.error.code, message: result.error.message } });
    return;
  }
  res.json(result);
}
