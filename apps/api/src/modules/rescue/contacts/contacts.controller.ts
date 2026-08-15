import { Request, Response } from 'express';
import {
  createContactSchema,
  createMessageSchema,
  listContactsSchema,
  listMessagesSchema,
  updateContactSchema,
  unreadCountSchema,
} from './contacts.validators';
import {
  createContact,
  createMessage,
  listContacts,
  listMessages,
  getContactById,
  updateContact,
  getPendingCount,
  getUnreadMessagesCount,
  getUnreadUpdatesCount,
  markThreadRead,
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

// Sin 'since': la marca de lectura de cada hilo esta en la base.
export async function getUnreadMessages(req: Request, res: Response): Promise<void> {
  const count = await getUnreadMessagesCount(req.user!.id);
  res.json({ count });
}

export async function postThreadRead(req: Request, res: Response): Promise<void> {
  const result = await markThreadRead(req.params.id, req.user!.id);
  if ('error' in result) {
    res.status(result.error.status).json({ error: { code: result.error.code, message: result.error.message } });
    return;
  }
  res.status(204).end();
}

export async function getMessages(req: Request, res: Response): Promise<void> {
  const parsed = listMessagesSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Parámetros inválidos', fields: parsed.error.flatten().fieldErrors },
    });
    return;
  }

  const result = await listMessages(req.params.id, req.user!.id, parsed.data);
  if ('error' in result) {
    res.status(result.error.status).json({ error: { code: result.error.code, message: result.error.message } });
    return;
  }
  res.json(result);
}

export async function postMessage(req: Request, res: Response): Promise<void> {
  const parsed = createMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', fields: parsed.error.flatten().fieldErrors },
    });
    return;
  }

  const result = await createMessage(req.params.id, req.user!.id, parsed.data);
  if ('error' in result) {
    res.status(result.error.status).json({ error: { code: result.error.code, message: result.error.message } });
    return;
  }
  res.status(201).json(result);
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
