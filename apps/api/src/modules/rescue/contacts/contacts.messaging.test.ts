import { describe, it, expect } from 'vitest';
import {
  MESSAGE_MAX_LENGTH,
  MY_READ_AT_SQL,
  READABLE_STATUSES,
  READABLE_STATUSES_SQL,
  UNREAD_COUNT_SUBQUERY,
  WRITABLE_STATUSES,
  canWriteThread,
  checkThreadRead,
  checkThreadWrite,
  isParticipant,
  otherPartyId,
  readColumnFor,
  type ThreadParties,
} from './contacts.messaging';

const INITIATOR = 'user-initiator';
const RESPONDER = 'user-responder';
const EXTRANO = 'user-extrano';

const thread = (status: string): ThreadParties => ({
  initiatorId: INITIATOR,
  responderId: RESPONDER,
  status,
});

const TODOS_LOS_ESTADOS = ['pending', 'active', 'completed', 'rejected'];

describe('isParticipant', () => {
  it('reconoce a las dos partes de la solicitud', () => {
    expect(isParticipant(thread('active'), INITIATOR)).toBe(true);
    expect(isParticipant(thread('active'), RESPONDER)).toBe(true);
  });

  it('no reconoce a nadie mas', () => {
    expect(isParticipant(thread('active'), EXTRANO)).toBe(false);
  });
});

describe('checkThreadWrite', () => {
  it('deja escribir a las dos partes mientras la solicitud esta aceptada', () => {
    expect(checkThreadWrite(thread('active'), INITIATOR)).toBeNull();
    expect(checkThreadWrite(thread('active'), RESPONDER)).toBeNull();
  });

  it('no deja escribir a un tercero en ningun estado, ni siquiera en active', () => {
    for (const status of TODOS_LOS_ESTADOS) {
      const denial = checkThreadWrite(thread(status), EXTRANO);
      expect(denial, `estado ${status}`).not.toBeNull();
      expect(denial?.code, `estado ${status}`).toBe('FORBIDDEN');
      expect(denial?.status, `estado ${status}`).toBe(403);
    }
  });

  it('no deja escribir en pending: todavia no hay relacion', () => {
    const denial = checkThreadWrite(thread('pending'), RESPONDER);

    expect(denial?.code).toBe('THREAD_NOT_OPEN');
    expect(denial?.status).toBe(403);
    expect(denial?.message).toContain('acepta');
  });

  it('no deja escribir en rejected: ya no hay relacion', () => {
    const denial = checkThreadWrite(thread('rejected'), INITIATOR);

    expect(denial?.code).toBe('THREAD_NOT_OPEN');
    expect(denial?.status).toBe(403);
  });

  it('en completed corta la escritura, y lo dice sin sugerir que se perdio el hilo', () => {
    const denial = checkThreadWrite(thread('completed'), INITIATOR);

    expect(denial?.code).toBe('THREAD_CLOSED');
    expect(denial?.status).toBe(403);
    expect(denial?.message).toContain('leer');
  });

  it('active es el unico estado en el que se escribe', () => {
    const escribibles = TODOS_LOS_ESTADOS.filter(
      (status) => checkThreadWrite(thread(status), INITIATOR) === null,
    );

    expect(escribibles).toEqual(['active']);
    expect(escribibles).toEqual([...WRITABLE_STATUSES]);
  });
});

describe('checkThreadRead', () => {
  it('deja leer a las dos partes con la solicitud aceptada o completada', () => {
    for (const status of ['active', 'completed']) {
      expect(checkThreadRead(thread(status), INITIATOR), `estado ${status}`).toBeNull();
      expect(checkThreadRead(thread(status), RESPONDER), `estado ${status}`).toBeNull();
    }
  });

  it('no deja leer a un tercero en ningun estado', () => {
    for (const status of TODOS_LOS_ESTADOS) {
      expect(checkThreadRead(thread(status), EXTRANO)?.code, `estado ${status}`).toBe('FORBIDDEN');
    }
  });

  it('no hay nada que leer en pending ni en rejected', () => {
    expect(checkThreadRead(thread('pending'), INITIATOR)?.code).toBe('THREAD_NOT_OPEN');
    expect(checkThreadRead(thread('rejected'), INITIATOR)?.code).toBe('THREAD_NOT_OPEN');
  });

  it('completed se lee aunque no se escriba: es la decision tomada al encargar esto', () => {
    expect(checkThreadRead(thread('completed'), RESPONDER)).toBeNull();
    expect(checkThreadWrite(thread('completed'), RESPONDER)).not.toBeNull();
  });

  it('todo lo que se escribe se puede leer', () => {
    for (const status of WRITABLE_STATUSES) {
      expect(READABLE_STATUSES, `estado ${status}`).toContain(status);
    }
  });
});

describe('canWriteThread', () => {
  it('resume checkThreadWrite en un booleano para la pantalla', () => {
    expect(canWriteThread(thread('active'), INITIATOR)).toBe(true);
    expect(canWriteThread(thread('completed'), INITIATOR)).toBe(false);
    expect(canWriteThread(thread('pending'), INITIATOR)).toBe(false);
    expect(canWriteThread(thread('rejected'), INITIATOR)).toBe(false);
    expect(canWriteThread(thread('active'), EXTRANO)).toBe(false);
  });
});

describe('otherPartyId', () => {
  it('devuelve la contraparte de cada uno', () => {
    expect(otherPartyId(thread('active'), INITIATOR)).toBe(RESPONDER);
    expect(otherPartyId(thread('active'), RESPONDER)).toBe(INITIATOR);
  });

  it('no le dice nada a quien no es parte del hilo', () => {
    expect(otherPartyId(thread('active'), EXTRANO)).toBeNull();
  });
});

describe('READABLE_STATUSES_SQL', () => {
  it('es la lista de estados legibles, entrecomillada para el IN del SQL', () => {
    expect(READABLE_STATUSES_SQL).toBe(`'active','completed'`);
  });

  it('sale de READABLE_STATUSES y no de una copia a mano', () => {
    for (const status of READABLE_STATUSES) {
      expect(READABLE_STATUSES_SQL).toContain(`'${status}'`);
    }
    expect(READABLE_STATUSES_SQL).not.toContain('pending');
    expect(READABLE_STATUSES_SQL).not.toContain('rejected');
  });
});

describe('readColumnFor', () => {
  it('le da a cada parte su propia columna', () => {
    expect(readColumnFor(thread('active'), INITIATOR)).toBe('initiator_read_at');
    expect(readColumnFor(thread('active'), RESPONDER)).toBe('responder_read_at');
  });

  it('no le da columna a quien no es parte: nadie de fuera marca nada como leido', () => {
    expect(readColumnFor(thread('active'), EXTRANO)).toBeNull();
  });

  it('las dos columnas son distintas, para que leer uno no marque por el otro', () => {
    expect(readColumnFor(thread('active'), INITIATOR)).not.toBe(
      readColumnFor(thread('active'), RESPONDER),
    );
  });
});

describe('MY_READ_AT_SQL', () => {
  it('elige la columna por parte y deja NULL a los demas', () => {
    expect(MY_READ_AT_SQL).toContain('c.initiator_id = :userId THEN c.initiator_read_at');
    expect(MY_READ_AT_SQL).toContain('c.responder_id = :userId THEN c.responder_read_at');
    expect(MY_READ_AT_SQL).not.toContain('ELSE');
  });
});

describe('UNREAD_COUNT_SUBQUERY', () => {
  it('cuenta solo lo que escribio el otro', () => {
    expect(UNREAD_COUNT_SUBQUERY).toContain('m.sender_id <> :userId');
  });

  it('lo compara contra la marca de lectura de quien pregunta', () => {
    expect(UNREAD_COUNT_SUBQUERY).toContain(MY_READ_AT_SQL);
    expect(UNREAD_COUNT_SUBQUERY).toContain('m.created_at >');
  });

  it('sin marca previa cuenta el hilo entero', () => {
    expect(UNREAD_COUNT_SUBQUERY).toContain(`COALESCE`);
    expect(UNREAD_COUNT_SUBQUERY).toContain(`'-infinity'::timestamptz`);
  });

  it('se ata al hilo de la fila y no cuenta los de otras solicitudes', () => {
    expect(UNREAD_COUNT_SUBQUERY).toContain('m.contact_id = c.id');
  });

  // Sin esta condicion, a un tercero el CASE le da NULL, el COALESCE lo vuelve
  // '-infinity' y el contador le devuelve el hilo entero en vez de cero.
  it('exige ser parte del hilo dentro de la subconsulta, no en quien la llame', () => {
    expect(UNREAD_COUNT_SUBQUERY).toContain(
      '(c.initiator_id = :userId OR c.responder_id = :userId)',
    );
  });
});

describe('MESSAGE_MAX_LENGTH', () => {
  it('es el tope unico que copian el validador, el CHECK de la tabla y el textarea', () => {
    expect(MESSAGE_MAX_LENGTH).toBe(2000);
  });
});
