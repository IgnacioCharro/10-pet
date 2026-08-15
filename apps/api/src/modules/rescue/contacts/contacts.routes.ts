import { Router, IRouter } from 'express';
import { requireAuth } from '../../../middleware/require-auth';
import {
  postContact,
  getContacts,
  getContact,
  patchContact,
  getPendingContactsCount,
  getUnreadContactsCount,
  getUnreadMessages,
  getMessages,
  postMessage,
  postThreadRead,
} from './contacts.controller';

export const contactsRouter: IRouter = Router();

contactsRouter.post('/', requireAuth, postContact);
contactsRouter.get('/', requireAuth, getContacts);
// Las rutas literales van antes que '/:id' para que Express no lea
// 'pending-count' como un id de solicitud.
contactsRouter.get('/pending-count', requireAuth, getPendingContactsCount);
contactsRouter.get('/unread-count', requireAuth, getUnreadContactsCount);
contactsRouter.get('/unread-messages-count', requireAuth, getUnreadMessages);
contactsRouter.get('/:id', requireAuth, getContact);
contactsRouter.patch('/:id', requireAuth, patchContact);
contactsRouter.get('/:id/messages', requireAuth, getMessages);
contactsRouter.post('/:id/messages', requireAuth, postMessage);
contactsRouter.post('/:id/read', requireAuth, postThreadRead);
