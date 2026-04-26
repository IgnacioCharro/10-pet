import { Router, IRouter } from 'express';
import { requireAuth } from '../../../middleware/require-auth';
import { postContact, getContacts, getContact, patchContact, getPendingContactsCount } from './contacts.controller';

export const contactsRouter: IRouter = Router();

contactsRouter.post('/', requireAuth, postContact);
contactsRouter.get('/', requireAuth, getContacts);
contactsRouter.get('/pending-count', requireAuth, getPendingContactsCount);
contactsRouter.get('/:id', requireAuth, getContact);
contactsRouter.patch('/:id', requireAuth, patchContact);
