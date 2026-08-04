import { fn, col } from 'sequelize';
import { Contact } from '../../db';

export interface OfferStats {
  offersAccepted: number;
  offersCompleted: number;
  offersRejected: number;
}

interface StatusCountRow {
  status: string;
  count: string | number;
}

// Cuenta los ofrecimientos del usuario agrupados por estado en una sola query.
// El filtro es initiator_id plano para que entre por idx_contacts_initiator.
export async function getOfferStats(userId: string): Promise<OfferStats> {
  const rows = (await Contact.findAll({
    where: { initiatorId: userId },
    attributes: ['status', [fn('COUNT', col('id')), 'count']],
    group: ['status'],
    raw: true,
  })) as unknown as StatusCountRow[];

  // Postgres devuelve COUNT como string; se normaliza a number antes de responder.
  // Si el alias 'count' faltara, Number() daria NaN y contaminaria tambien
  // casesVolunteered, que el perfil publico ya pinta: mejor contar cero.
  const countByStatus: Record<string, number> = {};
  for (const row of rows) {
    const n = Number(row.count);
    countByStatus[row.status] = Number.isFinite(n) ? n : 0;
  }

  const active = countByStatus['active'] ?? 0;
  const completed = countByStatus['completed'] ?? 0;
  const rejected = countByStatus['rejected'] ?? 0;

  // Un 'completed' fue aceptado antes (pending->active->completed), asi que suma
  // a aceptados. Los 'pending' no cuentan ni a favor ni en contra.
  return {
    offersAccepted: active + completed,
    offersCompleted: completed,
    offersRejected: rejected,
  };
}
