// Quien puede leer y escribir en el hilo de una solicitud de ayuda. Sin imports
// a proposito: la regla vive aca y no dentro de un SQL, porque las suites de
// integracion de este repo mockean el servicio y la base, asi que nada de lo que
// pase dentro de una query lo ejecuta ningun test. Misma razon, y mismo remedio,
// que cases.ordering.ts y cases.publisher.ts.
//
// El servicio no decide nada: pregunta aca y aplica lo que salga.

export interface ThreadParties {
  initiatorId: string;
  responderId: string;
  status: string;
}

export interface ThreadDenial {
  code: string;
  message: string;
  status: number;
}

// El mismo tope lo repiten el schema Zod, el CHECK de la tabla y el textarea de
// la web. Que salga de aca evita que se separen.
export const MESSAGE_MAX_LENGTH = 2000;

// Se escribe solo mientras la solicitud esta aceptada. En 'pending' todavia no
// hay relacion y en 'rejected' ya no la hay.
export const WRITABLE_STATUSES: readonly string[] = ['active'];

// Se lee ademas cuando ya termino: 'completed' cierra la colaboracion, no borra
// lo que las dos partes se dijeron. Es la decision que se tomo en voz alta al
// encargar esto, no un descuido.
export const READABLE_STATUSES: readonly string[] = ['active', 'completed'];

// Lista de estados legibles como fragmento SQL, derivada de la constante de
// arriba en vez de escrita a mano: una copia dejaria que el contador de no
// leidos contara mensajes de hilos que la pantalla no deja abrir.
export const READABLE_STATUSES_SQL = READABLE_STATUSES.map((s) => `'${s}'`).join(',');

export function isParticipant(thread: ThreadParties, userId: string): boolean {
  return thread.initiatorId === userId || thread.responderId === userId;
}

const FORBIDDEN: ThreadDenial = {
  code: 'FORBIDDEN',
  message: 'Acceso no autorizado',
  status: 403,
};

// Por que ese hilo no esta abierto todavia, o ya no lo esta. El texto cambia por
// estado porque "no podes" a secas no le dice a nadie que hacer.
//
// Estos mensajes los muestra la pantalla tal cual llegan, asi que van acentuados
// como el resto de los del API ('No podés contactar tu propio caso'). Los
// comentarios de este repo van sin acentos; el texto que lee una persona, no.
function notOpenDenial(status: string): ThreadDenial {
  if (status === 'pending') {
    return {
      code: 'THREAD_NOT_OPEN',
      message: 'La conversación se abre cuando se acepta la solicitud',
      status: 403,
    };
  }
  return {
    code: 'THREAD_NOT_OPEN',
    message: 'La solicitud fue rechazada: no hay conversación',
    status: 403,
  };
}

// Devuelve null si puede; el motivo del rechazo si no. Nadie fuera de las dos
// partes de esa solicitud: ni un admin, ni el dueno de otro caso.
export function checkThreadRead(thread: ThreadParties, userId: string): ThreadDenial | null {
  if (!isParticipant(thread, userId)) return FORBIDDEN;
  if (!READABLE_STATUSES.includes(thread.status)) return notOpenDenial(thread.status);
  return null;
}

export function checkThreadWrite(thread: ThreadParties, userId: string): ThreadDenial | null {
  if (!isParticipant(thread, userId)) return FORBIDDEN;
  if (WRITABLE_STATUSES.includes(thread.status)) return null;
  // Un hilo completado se sigue leyendo, asi que el motivo no es que no exista.
  if (READABLE_STATUSES.includes(thread.status)) {
    return {
      code: 'THREAD_CLOSED',
      message: 'La solicitud está completada: podés leer la conversación pero ya no escribir',
      status: 403,
    };
  }
  return notOpenDenial(thread.status);
}

// Para que la pantalla sepa si mostrar el compositor sin volver a razonar la
// regla por su cuenta.
export function canWriteThread(thread: ThreadParties, userId: string): boolean {
  return checkThreadWrite(thread, userId) === null;
}

// Quien es el otro. Devuelve null si el usuario no es parte del hilo, para que
// nadie de fuera pueda usar esto como oraculo de identidades.
export function otherPartyId(thread: ThreadParties, userId: string): string | null {
  if (thread.initiatorId === userId) return thread.responderId;
  if (thread.responderId === userId) return thread.initiatorId;
  return null;
}

// --- Marcas de lectura -------------------------------------------------------
//
// Cada parte tiene su propia marca en la fila de la solicitud. La alternativa
// era un unico marcador en el navegador, pero entonces abrir un hilo daba por
// leidos los mensajes de todos los demas.

export type ReadColumn = 'initiator_read_at' | 'responder_read_at';

// Que columna le toca a este usuario en este hilo. Null si no es parte: la
// consulta que use esto no debe escribir nada.
export function readColumnFor(thread: ThreadParties, userId: string): ReadColumn | null {
  if (thread.initiatorId === userId) return 'initiator_read_at';
  if (thread.responderId === userId) return 'responder_read_at';
  return null;
}

// La misma eleccion, como expresion SQL, para las consultas que la necesitan
// por fila y no pueden preguntar en TypeScript. Espera :userId en los
// replacements y la tabla contacts aliasada como c. Devuelve NULL para quien no
// es parte del hilo.
export const MY_READ_AT_SQL = `CASE
       WHEN c.initiator_id = :userId THEN c.initiator_read_at
       WHEN c.responder_id = :userId THEN c.responder_read_at
     END`;

// Mensajes de ese hilo que escribio el otro despues de mi ultima lectura. El
// '-infinity' cubre el hilo nunca abierto: sin marca, todo esta sin leer.
//
// La condicion de ser parte va dentro y no confiada a quien llame: sin ella, a
// un tercero el CASE le da NULL, el COALESCE lo convierte en '-infinity' y el
// contador le devuelve el hilo entero en vez de cero.
export const UNREAD_COUNT_SUBQUERY = `(SELECT COUNT(*)
     FROM contact_messages m
     WHERE m.contact_id = c.id
       AND m.sender_id <> :userId
       AND (c.initiator_id = :userId OR c.responder_id = :userId)
       AND m.created_at > COALESCE(${MY_READ_AT_SQL}, '-infinity'::timestamptz))`;
