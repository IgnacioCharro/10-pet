import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../db';
import { CreateContactInput, ListContactsQuery, UpdateContactInput } from './contacts.validators';
import { contactRequestQueue } from '../../../jobs/queue';

export interface ContactRow {
  id: string;
  caseId: string;
  initiatorId: string;
  initiatorName: string | null;
  responderId: string;
  status: string;
  contactMethod: string;
  message: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  caseAnimalType: string | null;
  caseLocationText: string | null;
}

function buildWhatsAppLink(phone: string, caseId: string): string {
  const digits = phone.replace(/\D/g, '');
  // Normalize Argentine numbers: strip leading 0, prepend country code 54
  const normalized = digits.startsWith('0') ? `54${digits.slice(1)}` : `54${digits}`;
  const text = encodeURIComponent(
    `Hola! Vi tu caso en 10Pet (ID: ${caseId}) y me gustaría ayudar.`,
  );
  return `https://wa.me/${normalized}?text=${text}`;
}

export async function createContact(
  userId: string,
  input: CreateContactInput,
): Promise<{ contact: ContactRow; whatsappLink: string | null } | { error: { code: string; message: string; status: number } }> {
  const [caseRow] = await sequelize.query<{
    id: string;
    userId: string;
    status: string;
    phoneContact: string | null;
    animalType: string;
  }>(
    `SELECT id, user_id AS "userId", status, phone_contact AS "phoneContact", animal_type AS "animalType"
     FROM cases WHERE id = :caseId`,
    { replacements: { caseId: input.caseId }, type: QueryTypes.SELECT },
  );

  if (!caseRow) {
    return { error: { code: 'CASE_NOT_FOUND', message: 'Caso no encontrado', status: 404 } };
  }
  if (caseRow.userId === userId) {
    return { error: { code: 'OWN_CASE', message: 'No podés contactar tu propio caso', status: 400 } };
  }
  if (!['abierto', 'en_rescate'].includes(caseRow.status)) {
    return { error: { code: 'CASE_CLOSED', message: 'El caso ya fue resuelto o está inactivo', status: 400 } };
  }

  let contact: ContactRow;
  try {
    const [row] = await sequelize.query<ContactRow>(
      `INSERT INTO contacts
         (id, case_id, initiator_id, responder_id, status, contact_method, message, created_at, updated_at)
       VALUES
         (gen_random_uuid(), :caseId, :initiatorId, :responderId, 'pending', 'whatsapp', :message, NOW(), NOW())
       RETURNING
         id,
         case_id AS "caseId",
         initiator_id AS "initiatorId",
         responder_id AS "responderId",
         status,
         contact_method AS "contactMethod",
         message,
         last_message_at AS "lastMessageAt",
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      {
        replacements: {
          caseId: input.caseId,
          initiatorId: userId,
          responderId: caseRow.userId,
          message: input.message ?? null,
        },
        type: QueryTypes.SELECT,
      },
    );
    contact = row;
  } catch (err: unknown) {
    // Unique constraint violation (23505 = duplicate key)
    if (err && typeof err === 'object' && 'parent' in err) {
      const parent = (err as { parent: { code?: string } }).parent;
      if (parent?.code === '23505') {
        return { error: { code: 'ALREADY_CONTACTED', message: 'Ya enviaste una solicitud de contacto para este caso', status: 409 } };
      }
    }
    throw err;
  }

  // Notify case owner via queue (fire-and-forget)
  if (contactRequestQueue) {
    contactRequestQueue.add(
      { contactId: contact.id, responderId: caseRow.userId, caseId: input.caseId },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    ).catch((err) => console.error('[queue] contact-request add failed:', err));
  }

  const whatsappLink = caseRow.phoneContact
    ? buildWhatsAppLink(caseRow.phoneContact, input.caseId)
    : null;

  return { contact, whatsappLink };
}

export async function listContacts(
  userId: string,
  query: ListContactsQuery,
): Promise<{ contacts: ContactRow[]; total: number }> {
  const conditions: string[] = [];
  const replacements: Record<string, unknown> = { userId };

  if (query.role === 'initiator') {
    conditions.push('c.initiator_id = :userId');
  } else if (query.role === 'responder') {
    conditions.push('c.responder_id = :userId');
  } else {
    conditions.push('(c.initiator_id = :userId OR c.responder_id = :userId)');
  }

  if (query.status) {
    conditions.push('c.status = :status');
    replacements.status = query.status;
  }

  const where = conditions.join(' AND ');
  const offset = (query.page - 1) * query.limit;
  replacements.limit = query.limit;
  replacements.offset = offset;

  const [{ count }] = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM contacts c WHERE ${where}`,
    { replacements, type: QueryTypes.SELECT },
  );

  const contacts = await sequelize.query<ContactRow>(
    `SELECT
       c.id,
       c.case_id AS "caseId",
       c.initiator_id AS "initiatorId",
       u.name AS "initiatorName",
       c.responder_id AS "responderId",
       c.status,
       c.contact_method AS "contactMethod",
       c.message,
       c.last_message_at AS "lastMessageAt",
       c.created_at AS "createdAt",
       c.updated_at AS "updatedAt",
       cs.animal_type AS "caseAnimalType",
       cs.location_text AS "caseLocationText"
     FROM contacts c
     LEFT JOIN cases cs ON cs.id = c.case_id
     LEFT JOIN users u ON u.id = c.initiator_id
     WHERE ${where}
     ORDER BY c.created_at DESC
     LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT },
  );

  return { contacts, total: parseInt(count, 10) };
}

export async function getContactById(
  contactId: string,
  userId: string,
): Promise<ContactRow | null | { error: { code: string; message: string; status: number } }> {
  const [contact] = await sequelize.query<ContactRow>(
    `SELECT
       id,
       case_id AS "caseId",
       initiator_id AS "initiatorId",
       responder_id AS "responderId",
       status,
       contact_method AS "contactMethod",
       message,
       last_message_at AS "lastMessageAt",
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM contacts
     WHERE id = :contactId`,
    { replacements: { contactId }, type: QueryTypes.SELECT },
  );

  if (!contact) return null;

  if (contact.initiatorId !== userId && contact.responderId !== userId) {
    return { error: { code: 'FORBIDDEN', message: 'Acceso no autorizado', status: 403 } };
  }

  return contact;
}

export async function updateContact(
  contactId: string,
  userId: string,
  input: UpdateContactInput,
): Promise<ContactRow | { error: { code: string; message: string; status: number } }> {
  const [existing] = await sequelize.query<ContactRow>(
    `SELECT id, initiator_id AS "initiatorId", responder_id AS "responderId", status
     FROM contacts WHERE id = :contactId`,
    { replacements: { contactId }, type: QueryTypes.SELECT },
  );

  if (!existing) {
    return { error: { code: 'NOT_FOUND', message: 'Contacto no encontrado', status: 404 } };
  }

  // Only responder can accept/reject; either party can complete
  if (input.status !== 'completed' && existing.responderId !== userId) {
    return { error: { code: 'FORBIDDEN', message: 'Solo el reportador puede aceptar o rechazar', status: 403 } };
  }
  if (input.status === 'completed' && existing.initiatorId !== userId && existing.responderId !== userId) {
    return { error: { code: 'FORBIDDEN', message: 'Acceso no autorizado', status: 403 } };
  }

  const VALID_TRANSITIONS: Record<string, string[]> = {
    pending: ['active', 'rejected'],
    active: ['completed'],
    completed: [],
    rejected: [],
  };

  if (!VALID_TRANSITIONS[existing.status]?.includes(input.status)) {
    return {
      error: {
        code: 'INVALID_TRANSITION',
        message: `No se puede pasar de '${existing.status}' a '${input.status}'`,
        status: 400,
      },
    };
  }

  const [updated] = await sequelize.query<ContactRow>(
    `UPDATE contacts
     SET status = :status, updated_at = NOW()
     WHERE id = :contactId
     RETURNING
       id,
       case_id AS "caseId",
       initiator_id AS "initiatorId",
       responder_id AS "responderId",
       status,
       contact_method AS "contactMethod",
       message,
       last_message_at AS "lastMessageAt",
       created_at AS "createdAt",
       updated_at AS "updatedAt"`,
    { replacements: { status: input.status, contactId }, type: QueryTypes.SELECT },
  );

  return updated;
}

export async function getPendingCount(userId: string): Promise<number> {
  const [{ count }] = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM contacts WHERE responder_id = :userId AND status = 'pending'`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );
  return parseInt(count, 10);
}

export async function getUnreadUpdatesCount(userId: string, since: Date): Promise<number> {
  const [{ count }] = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM contacts
     WHERE initiator_id = :userId AND status != 'pending' AND updated_at > :since`,
    { replacements: { userId, since }, type: QueryTypes.SELECT },
  );
  return parseInt(count, 10);
}
