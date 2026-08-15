import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../db';
import {
  CreateContactInput,
  CreateMessageInput,
  ListContactsQuery,
  ListMessagesQuery,
  UpdateContactInput,
} from './contacts.validators';
import {
  READABLE_STATUSES_SQL,
  ThreadDenial,
  ThreadParties,
  UNREAD_COUNT_SUBQUERY,
  canWriteThread,
  checkThreadRead,
  checkThreadWrite,
  readColumnFor,
} from './contacts.messaging';
import { contactRequestQueue } from '../../../jobs/queue';

export interface ContactRow {
  id: string;
  caseId: string;
  initiatorId: string;
  initiatorName: string | null;
  responderId: string;
  responderName: string | null;
  status: string;
  contactMethod: string;
  message: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  caseAnimalType: string | null;
  caseLocationText: string | null;
  // Mensajes de ese hilo que todavia no vi. Lo calcula la consulta de listado;
  // el detalle no lo trae, porque abrirlo es justamente lo que lo pone a cero.
  unreadCount?: number;
}

export interface ContactMessageRow {
  id: string;
  contactId: string;
  senderId: string;
  body: string;
  createdAt: Date;
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
       r.name AS "responderName",
       c.status,
       c.contact_method AS "contactMethod",
       c.message,
       c.last_message_at AS "lastMessageAt",
       c.created_at AS "createdAt",
       c.updated_at AS "updatedAt",
       cs.animal_type AS "caseAnimalType",
       cs.location_text AS "caseLocationText",
       ${UNREAD_COUNT_SUBQUERY}::int AS "unreadCount"
     FROM contacts c
     LEFT JOIN cases cs ON cs.id = c.case_id
     LEFT JOIN users u ON u.id = c.initiator_id
     LEFT JOIN users r ON r.id = c.responder_id
     WHERE ${where}
     ORDER BY c.created_at DESC
     LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT },
  );

  return { contacts, total: parseInt(count, 10) };
}

// Trae ademas los nombres de las dos partes y de que caso se trata, porque la
// pantalla del hilo se dibuja con esto: quien es el otro y sobre que animal
// estan hablando. Nada del telefono ni del enlace de WhatsApp entra aca.
export async function getContactById(
  contactId: string,
  userId: string,
): Promise<(ContactRow & { canWrite: boolean }) | null | { error: { code: string; message: string; status: number } }> {
  const [contact] = await sequelize.query<ContactRow>(
    `SELECT
       c.id,
       c.case_id AS "caseId",
       c.initiator_id AS "initiatorId",
       u.name AS "initiatorName",
       c.responder_id AS "responderId",
       r.name AS "responderName",
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
     LEFT JOIN users r ON r.id = c.responder_id
     WHERE c.id = :contactId`,
    { replacements: { contactId }, type: QueryTypes.SELECT },
  );

  if (!contact) return null;

  if (contact.initiatorId !== userId && contact.responderId !== userId) {
    return { error: { code: 'FORBIDDEN', message: 'Acceso no autorizado', status: 403 } };
  }

  // La pantalla no vuelve a razonar la regla: pregunta al mismo modulo puro que
  // aplica el POST de mensajes.
  return { ...contact, canWrite: canWriteThread(contact, userId) };
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

// --- Mensajes del hilo -------------------------------------------------------
//
// El hilo es la solicitud de ayuda: no hay entidad "conversacion". Quien puede
// leer y escribir lo decide contacts.messaging.ts, que es donde vive la regla y
// donde tiene tests; aca solo se aplica lo que ese modulo devuelve.

const NOT_FOUND = { code: 'NOT_FOUND', message: 'Contacto no encontrado', status: 404 } as const;

async function loadThread(contactId: string): Promise<ThreadParties | null> {
  const [thread] = await sequelize.query<ThreadParties>(
    `SELECT initiator_id AS "initiatorId", responder_id AS "responderId", status
     FROM contacts WHERE id = :contactId`,
    { replacements: { contactId }, type: QueryTypes.SELECT },
  );
  return thread ?? null;
}

export async function listMessages(
  contactId: string,
  userId: string,
  query: ListMessagesQuery,
): Promise<
  { messages: ContactMessageRow[]; total: number; canWrite: boolean } | { error: ThreadDenial }
> {
  const thread = await loadThread(contactId);
  if (!thread) return { error: { ...NOT_FOUND } };

  const denial = checkThreadRead(thread, userId);
  if (denial) return { error: denial };

  const [{ count }] = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM contact_messages WHERE contact_id = :contactId`,
    { replacements: { contactId }, type: QueryTypes.SELECT },
  );

  const offset = (query.page - 1) * query.limit;
  // Se piden los mas nuevos primero para que la pagina 1 sea el final del hilo,
  // y se devuelven al derecho para pintarlos de arriba abajo.
  const newestFirst = await sequelize.query<ContactMessageRow>(
    `SELECT
       id,
       contact_id AS "contactId",
       sender_id AS "senderId",
       body,
       created_at AS "createdAt"
     FROM contact_messages
     WHERE contact_id = :contactId
     ORDER BY created_at DESC, id DESC
     LIMIT :limit OFFSET :offset`,
    {
      replacements: { contactId, limit: query.limit, offset },
      type: QueryTypes.SELECT,
    },
  );

  return {
    messages: newestFirst.reverse(),
    total: parseInt(count, 10),
    canWrite: canWriteThread(thread, userId),
  };
}

export async function createMessage(
  contactId: string,
  userId: string,
  input: CreateMessageInput,
): Promise<ContactMessageRow | { error: ThreadDenial }> {
  const thread = await loadThread(contactId);
  if (!thread) return { error: { ...NOT_FOUND } };

  const denial = checkThreadWrite(thread, userId);
  if (denial) return { error: denial };

  // Una sola sentencia para el insert y el sello de last_message_at: Postgres
  // ejecuta los CTE que escriben aunque la consulta principal no los lea, asi
  // que o entran los dos o no entra ninguno. La columna existe sin usar desde la
  // migracion de abril; este es el unico sitio que la escribe.
  const [message] = await sequelize.query<ContactMessageRow>(
    `WITH inserted AS (
       INSERT INTO contact_messages (id, contact_id, sender_id, body, created_at, updated_at)
       VALUES (gen_random_uuid(), :contactId, :senderId, :body, NOW(), NOW())
       RETURNING id, contact_id, sender_id, body, created_at
     ), touched AS (
       UPDATE contacts SET last_message_at = NOW() WHERE id = :contactId
     )
     SELECT
       id,
       contact_id AS "contactId",
       sender_id AS "senderId",
       body,
       created_at AS "createdAt"
     FROM inserted`,
    {
      replacements: { contactId, senderId: userId, body: input.body },
      type: QueryTypes.SELECT,
    },
  );

  return message;
}

// Deja el hilo por leido para quien lo abrio, y solo para el: la columna la
// elige el modulo puro, no un CASE escondido en el SQL.
export async function markThreadRead(
  contactId: string,
  userId: string,
): Promise<{ ok: true } | { error: ThreadDenial }> {
  const thread = await loadThread(contactId);
  if (!thread) return { error: { ...NOT_FOUND } };

  const denial = checkThreadRead(thread, userId);
  if (denial) return { error: denial };

  const column = readColumnFor(thread, userId);
  // checkThreadRead ya garantiza que es parte del hilo; esto es el cinturon.
  if (!column) return { error: { code: 'FORBIDDEN', message: 'Acceso no autorizado', status: 403 } };

  await sequelize.query(
    `UPDATE contacts SET ${column} = NOW() WHERE id = :contactId`,
    { replacements: { contactId }, type: QueryTypes.UPDATE },
  );

  return { ok: true };
}

// Cuenta propia, separada de getUnreadUpdatesCount: aquella mira solo al
// initiator y solo cambios de estado, y los mensajes van en las dos direcciones.
// No recibe un 'since' del navegador como aquella: la marca por hilo vive en la
// base, asi que el numero es el mismo desde cualquier dispositivo y abrir una
// conversacion no da por leidas las demas. Solo cuentan los hilos que la
// pantalla deja abrir, por eso el IN sale de la misma constante que la regla.
export async function getUnreadMessagesCount(userId: string): Promise<number> {
  const [{ count }] = await sequelize.query<{ count: string }>(
    `SELECT COALESCE(SUM(${UNREAD_COUNT_SUBQUERY}), 0) AS count
     FROM contacts c
     WHERE (c.initiator_id = :userId OR c.responder_id = :userId)
       AND c.status IN (${READABLE_STATUSES_SQL})`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );
  return parseInt(count, 10);
}
