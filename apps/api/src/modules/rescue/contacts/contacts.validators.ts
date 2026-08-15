import { z } from 'zod';
import { MESSAGE_MAX_LENGTH } from './contacts.messaging';

export const createContactSchema = z.object({
  caseId: z.string().uuid('caseId debe ser un UUID válido'),
  message: z.string().max(500).optional(),
});

export const listContactsSchema = z.object({
  role: z.enum(['initiator', 'responder']).optional(),
  status: z.enum(['pending', 'active', 'completed', 'rejected']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const updateContactSchema = z.object({
  status: z.enum(['active', 'rejected', 'completed']),
});

export const unreadCountSchema = z.object({
  since: z.string().datetime({ offset: true }).optional(),
});

// El trim va antes del min(1): sin el, tres espacios pasan como mensaje y el
// CHECK de la tabla los deja entrar porque char_length los cuenta.
export const createMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'El mensaje no puede estar vacío')
    .max(MESSAGE_MAX_LENGTH, `El mensaje no puede superar los ${MESSAGE_MAX_LENGTH} caracteres`),
});

// Pagina 1 son los mensajes mas nuevos: un hilo de rescate se lee por el final.
export const listMessagesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type ListContactsQuery = z.infer<typeof listContactsSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type UnreadCountQuery = z.infer<typeof unreadCountSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesSchema>;
