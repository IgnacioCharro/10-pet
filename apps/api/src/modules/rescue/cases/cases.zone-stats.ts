import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../db';

export interface ZoneStatsQuery {
  lat: number;
  lng: number;
  radius: number;
}

export interface ZoneStats {
  activeCases: number;
  resolvedThisMonth: number;
  byUrgency: { critica: number; alta: number; media: number; baja: number };
  byListingType: { found: number; lost: number };
}

interface ZoneStatsDbRow {
  activeCases: string;
  resolvedThisMonth: string;
  critica: string;
  alta: string;
  media: string;
  baja: string;
  found: string;
  lost: string;
}

/**
 * Metricas del rail de Inicio. Una sola pasada por la tabla: los seis
 * contadores salen de FILTER sobre el mismo WHERE geografico, en vez de seis
 * consultas con el mismo ST_DWithin.
 *
 * Los conteos por urgencia y por tipo miran solo casos abiertos: son la
 * leyenda de lo que se ve en el mapa, no un historico.
 */
export async function getZoneStats(query: ZoneStatsQuery): Promise<ZoneStats> {
  const { lat, lng, radius } = query;

  const [row] = await sequelize.query<ZoneStatsDbRow>(
    `SELECT
       COUNT(*) FILTER (WHERE c.status IN ('abierto', 'en_rescate')) AS "activeCases",
       COUNT(*) FILTER (
         WHERE c.status = 'resuelto'
           AND c.updated_at >= date_trunc('month', NOW())
       ) AS "resolvedThisMonth",
       COUNT(*) FILTER (WHERE c.status IN ('abierto','en_rescate') AND c.urgency_level = 5) AS "critica",
       COUNT(*) FILTER (WHERE c.status IN ('abierto','en_rescate') AND c.urgency_level = 4) AS "alta",
       COUNT(*) FILTER (WHERE c.status IN ('abierto','en_rescate') AND c.urgency_level = 3) AS "media",
       COUNT(*) FILTER (WHERE c.status IN ('abierto','en_rescate') AND c.urgency_level <= 2) AS "baja",
       COUNT(*) FILTER (WHERE c.status IN ('abierto','en_rescate') AND c.listing_type = 'found') AS "found",
       COUNT(*) FILTER (WHERE c.status IN ('abierto','en_rescate') AND c.listing_type = 'lost') AS "lost"
     FROM cases c
     WHERE ST_DWithin(
       c.location::geography,
       ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
       :radiusM
     )`,
    {
      replacements: { lat, lng, radiusM: radius * 1000 },
      type: QueryTypes.SELECT,
    },
  );

  // COUNT devuelve bigint, que el driver serializa como string. Sin el Number
  // la respuesta JSON saldria con comillas y el front sumaria strings.
  const n = (v: string | undefined): number => Number(v ?? 0);

  return {
    activeCases: n(row?.activeCases),
    resolvedThisMonth: n(row?.resolvedThisMonth),
    byUrgency: {
      critica: n(row?.critica),
      alta: n(row?.alta),
      media: n(row?.media),
      baja: n(row?.baja),
    },
    byListingType: {
      found: n(row?.found),
      lost: n(row?.lost),
    },
  };
}
