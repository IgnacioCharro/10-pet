import { QueryTypes } from 'sequelize';
import { sequelize, Case, CaseImage, CaseUpdate } from '../../../db';
import type { Whereabouts } from '../../../models/case.model';
import {
  CreateCaseInput,
  ListCasesQuery,
  NearbyCasesQuery,
  FeedCasesQuery,
  UpdateCaseInput,
  AddUpdateInput,
} from './cases.validators';
import {
  buildListOrderBy,
  buildFeedOrderBy,
  FEED_VOLUNTEER_COUNT_EXPR,
} from './cases.ordering';
import { resolvePublisherName } from './cases.publisher';
import { notifyNewCaseQueue } from '../../../jobs/queue';

export interface CaseRow {
  id: string;
  userId: string;
  listingType: string;
  animalType: string;
  description: string;
  status: string;
  resolutionType: string | null;
  urgencyLevel: number;
  lat: number;
  lng: number;
  locationText: string | null;
  referenceNote: string | null;
  title: string;
  publicCode: string;
  animalCondition: string | null;
  seenAt: Date | null;
  animalSex: string | null;
  animalSize: string | null;
  animalColor: string | null;
  whereabouts: Whereabouts;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  distanceKm?: number;
  heroUrl?: string | null;
}

export interface CaseImageRow {
  id: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  position: number;
}

export interface CaseUpdateRow {
  id: string;
  userId: string;
  updateType: string;
  content: string | null;
  hostName: string | null;
  createdAt: Date;
}

export interface VolunteerRow {
  userId: string;
  userName: string | null;
  status: string;
}

export interface CaseDetail extends CaseRow {
  images: CaseImageRow[];
  updates: CaseUpdateRow[];
  // Never null: u.name can be, resolvePublisherName settles it before returning
  publisherName: string;
  volunteers: VolunteerRow[];
}

// Extracts lat/lng from PostGIS GEOMETRY; avoids WKB decoding in JS layer
const BASE_CASE_SELECT = `
  c.id,
  c.user_id AS "userId",
  c.listing_type AS "listingType",
  c.animal_type AS "animalType",
  c.description,
  c.status,
  c.resolution_type AS "resolutionType",
  c.urgency_level AS "urgencyLevel",
  ST_Y(c.location) AS lat,
  ST_X(c.location) AS lng,
  c.location_text AS "locationText",
  c.reference_note AS "referenceNote",
  c.title,
  c.public_code AS "publicCode",
  c.animal_condition AS "animalCondition",
  c.seen_at AS "seenAt",
  c.animal_sex AS "animalSex",
  c.animal_size AS "animalSize",
  c.animal_color AS "animalColor",
  c.whereabouts,
  c.created_at AS "createdAt",
  c.updated_at AS "updatedAt",
  c.resolved_at AS "resolvedAt"
`;

const HERO_URL_SELECT = `
  (SELECT ci.cloudinary_url FROM case_images ci
   WHERE ci.case_id = c.id ORDER BY ci.position ASC LIMIT 1) AS "heroUrl"
`;

export async function createCase(
  userId: string,
  input: CreateCaseInput,
): Promise<CaseRow> {
  const { lat, lng } = input.location;

  const result = await sequelize.query<CaseRow>(
    `INSERT INTO cases
       (id, user_id, listing_type, title, animal_type, description, status, urgency_level,
        location, location_text, reference_note, animal_condition, seen_at, phone_contact,
        animal_sex, animal_size, animal_color, whereabouts,
        created_at, updated_at)
     VALUES
       (gen_random_uuid(), :userId, :listingType, :title, :animalType, :description, 'abierto', :urgencyLevel,
        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), :locationText, :referenceNote, :animalCondition, :seenAt, :phoneContact,
        :animalSex, :animalSize, :animalColor, :whereabouts,
        NOW(), NOW())
     RETURNING
       id,
       user_id AS "userId",
       listing_type AS "listingType",
       animal_type AS "animalType",
       description,
       status,
       resolution_type AS "resolutionType",
       urgency_level AS "urgencyLevel",
       ST_Y(location) AS lat,
       ST_X(location) AS lng,
       location_text AS "locationText",
       reference_note AS "referenceNote",
       title,
       public_code AS "publicCode",
       animal_condition AS "animalCondition",
       seen_at AS "seenAt",
       animal_sex AS "animalSex",
       animal_size AS "animalSize",
       animal_color AS "animalColor",
       whereabouts,
       created_at AS "createdAt",
       updated_at AS "updatedAt",
       resolved_at AS "resolvedAt"`,
    {
      replacements: {
        userId,
        listingType: input.listingType,
        animalType: input.animalType,
        description: input.description,
        urgencyLevel: input.urgencyLevel,
        lat,
        lng,
        locationText: input.locationText ?? null,
        referenceNote: input.referenceNote ?? null,
        title: input.title,
        animalCondition: input.animalCondition ?? null,
        seenAt: input.seenAt ?? null,
        phoneContact: input.phoneContact ?? null,
        animalSex: input.animalSex ?? null,
        animalSize: input.animalSize ?? null,
        animalColor: input.animalColor ?? null,
        whereabouts: input.whereabouts,
      },
      type: QueryTypes.SELECT,
    },
  );

  const newCase = result[0];

  // El historial arranca contando la verdad: si el animal no quedo en la calle,
  // el primer hecho del caso es quien lo tiene. Reusa el tipo de novedad que ya
  // existe en vez de inventar un campo paralelo. 'desconocido' no cuenta: es
  // ausencia de dato, no una garantia de que alguien lo tenga.
  if (input.whereabouts === 'con_quien_publica' || input.whereabouts === 'con_un_tercero') {
    await CaseUpdate.create({
      caseId: newCase.id,
      userId,
      updateType: 'alojamiento',
      content: null,
      hostName: input.hostName ?? null,
    });
  }

  if (notifyNewCaseQueue) {
    notifyNewCaseQueue.add(
      {
        caseId: newCase.id,
        animalType: newCase.animalType,
        description: newCase.description,
        urgencyLevel: newCase.urgencyLevel,
        locationText: newCase.locationText,
        lat: newCase.lat,
        lng: newCase.lng,
        creatorId: userId,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 10000 } },
    ).catch((err) => console.error('[queue] notify-new-case add failed:', err));
  }

  return newCase;
}

export async function insertCaseImages(
  caseId: string,
  images: Array<{ cloudinaryUrl: string; cloudinaryPublicId: string; position: number }>,
): Promise<void> {
  if (images.length === 0) return;
  await CaseImage.bulkCreate(
    images.map((img) => ({ caseId, ...img })),
  );
}

export async function listCases(
  query: ListCasesQuery,
): Promise<{ cases: CaseRow[]; total: number }> {
  const {
    lat, lng, radius, status, animalType, listingType, urgencyMin, page, limit, sort,
    animalSex, animalSize, animalColor, sheltered,
  } = query;

  const conditions: string[] = [];
  const replacements: Record<string, unknown> = { limit, offset: (page - 1) * limit };

  if (status) {
    conditions.push(`c.status = :status`);
    replacements.status = status;
  } else {
    conditions.push(`c.status IN ('abierto','en_rescate')`);
  }

  if (animalType) {
    conditions.push(`c.animal_type = :animalType`);
    replacements.animalType = animalType;
  }

  if (listingType) {
    conditions.push(`c.listing_type = :listingType`);
    replacements.listingType = listingType;
  }

  if (urgencyMin !== undefined) {
    conditions.push(`c.urgency_level >= :urgencyMin`);
    replacements.urgencyMin = urgencyMin;
  }

  if (animalSex) {
    conditions.push(`c.animal_sex = :animalSex`);
    replacements.animalSex = animalSex;
  }

  if (animalSize) {
    conditions.push(`c.animal_size = :animalSize`);
    replacements.animalSize = animalSize;
  }

  if (animalColor) {
    conditions.push(`c.animal_color = :animalColor`);
    replacements.animalColor = animalColor;
  }

  if (sheltered === false) {
    conditions.push(`c.whereabouts NOT IN ('con_quien_publica', 'con_un_tercero')`);
  } else if (sheltered === true) {
    conditions.push(`c.whereabouts IN ('con_quien_publica', 'con_un_tercero')`);
  }

  let distanceExpr = 'NULL::float';
  if (lat !== undefined && lng !== undefined) {
    conditions.push(
      `ST_DWithin(c.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radiusM)`,
    );
    replacements.lat = lat;
    replacements.lng = lng;
    replacements.radiusM = radius * 1000;
    distanceExpr = `ST_Distance(c.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) / 1000`;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const orderBy = buildListOrderBy(sort, lat !== undefined && lng !== undefined);

  const rows = await sequelize.query<CaseRow & { distanceKm: number | null }>(
    `SELECT ${BASE_CASE_SELECT}, ${distanceExpr} AS "distanceKm", ${HERO_URL_SELECT}
     FROM cases c
     ${where}
     ORDER BY ${orderBy}
     LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT },
  );

  const [countResult] = await sequelize.query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM cases c ${where}`,
    { replacements, type: QueryTypes.SELECT },
  );

  return { cases: rows, total: parseInt(countResult.total, 10) };
}

// Los casos propios del dashboard: sin filtro de estado (el dueno ve tambien
// los resueltos e inactivos) y sin filtro geografico
export async function listCasesByUser(userId: string): Promise<CaseRow[]> {
  return sequelize.query<CaseRow>(
    `SELECT ${BASE_CASE_SELECT}, ${HERO_URL_SELECT}
     FROM cases c
     WHERE c.user_id = :userId
     ORDER BY c.created_at DESC
     LIMIT 50`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );
}

/**
 * Los estados que un caso muestra en publico. 'inactivo', 'spam' y 'archivado'
 * son decisiones de moderacion: listarlas en un perfil abierto las haria
 * publicas sin que nadie lo pidiera.
 */
const PUBLIC_CASE_STATUSES = `('abierto','en_rescate','resuelto')`;

/**
 * Los casos de una persona, para su perfil publico: los que publico y aquellos en
 * los que ayudo.
 *
 * "Ayudo" es la misma definicion que ya usa el contador de casos ayudados y la
 * seccion de voluntarios de la ficha: un contacto propio que el autor acepto
 * ('active') o dio por terminado ('completed'). Se cuenta DISTINCT por caso
 * porque la lista muestra casos, no ofrecimientos.
 */
export async function listPublicCasesByUser(
  userId: string,
): Promise<{ published: CaseRow[]; volunteered: CaseRow[] }> {
  const [published, volunteered] = await Promise.all([
    sequelize.query<CaseRow>(
      `SELECT ${BASE_CASE_SELECT}, ${HERO_URL_SELECT}
       FROM cases c
       WHERE c.user_id = :userId
         AND c.status IN ${PUBLIC_CASE_STATUSES}
       ORDER BY c.created_at DESC
       LIMIT 50`,
      { replacements: { userId }, type: QueryTypes.SELECT },
    ),
    sequelize.query<CaseRow>(
      `SELECT DISTINCT ON (c.id) ${BASE_CASE_SELECT}, ${HERO_URL_SELECT}
       FROM cases c
       JOIN contacts co ON co.case_id = c.id
       WHERE co.initiator_id = :userId
         AND co.status IN ('active','completed')
         AND c.status IN ${PUBLIC_CASE_STATUSES}
       ORDER BY c.id, c.created_at DESC
       LIMIT 50`,
      { replacements: { userId }, type: QueryTypes.SELECT },
    ),
  ]);

  // DISTINCT ON obliga a ordenar por c.id primero, asi que el orden por fecha se
  // rehace aca: la lista tiene 50 filas como mucho.
  volunteered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { published, volunteered };
}

export async function getNearbyCases(query: NearbyCasesQuery): Promise<CaseRow[]> {
  const { lat, lng, radius } = query;

  return sequelize.query<CaseRow>(
    `SELECT ${BASE_CASE_SELECT},
            ST_Distance(c.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) / 1000 AS "distanceKm",
            ${HERO_URL_SELECT}
     FROM cases c
     WHERE c.status IN ('abierto','en_rescate')
       AND ST_DWithin(
             c.location::geography,
             ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
             :radiusM
           )
     ORDER BY "distanceKm" ASC
     LIMIT 50`,
    {
      replacements: { lat, lng, radiusM: radius * 1000 },
      type: QueryTypes.SELECT,
    },
  );
}

export async function getCaseById(id: string): Promise<CaseDetail | null> {
  const rows = await sequelize.query<CaseRow & { publisherName: string | null }>(
    `SELECT ${BASE_CASE_SELECT},
       u.name AS "publisherName"
     FROM cases c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.id = :id`,
    { replacements: { id }, type: QueryTypes.SELECT },
  );

  if (rows.length === 0) return null;
  const caseRow = rows[0];

  const images = await CaseImage.findAll({
    where: { caseId: id },
    order: [['position', 'ASC']],
    attributes: ['id', 'cloudinaryUrl', 'cloudinaryPublicId', 'position'],
  });

  const updates = await CaseUpdate.findAll({
    where: { caseId: id },
    order: [['createdAt', 'DESC']],
    attributes: ['id', 'userId', 'updateType', 'content', 'hostName', 'createdAt'],
  });

  const volunteers = await sequelize.query<VolunteerRow>(
    `SELECT co.initiator_id AS "userId", u.name AS "userName", co.status
     FROM contacts co
     LEFT JOIN users u ON co.initiator_id = u.id
     WHERE co.case_id = :id AND co.status IN ('active', 'completed')
     ORDER BY co.created_at ASC`,
    { replacements: { id }, type: QueryTypes.SELECT },
  );

  return {
    ...caseRow,
    publisherName: resolvePublisherName(caseRow.publisherName),
    images: images.map((img) => img.toJSON() as CaseImageRow),
    updates: updates.map((u) => u.toJSON() as CaseUpdateRow),
    volunteers,
  };
}

export async function updateCase(
  id: string,
  userId: string,
  isAdmin: boolean,
  input: UpdateCaseInput,
): Promise<CaseRow | null> {
  const existing = await Case.findByPk(id);
  if (!existing) return null;

  if (existing.userId !== userId && !isAdmin) {
    throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN', status: 403 });
  }

  const setClauses: string[] = [];
  const replacements: Record<string, unknown> = { id };

  if (input.status !== undefined) {
    setClauses.push(`status = :status`);
    replacements.status = input.status;
    if (input.status === 'resuelto') {
      setClauses.push(`resolved_at = NOW()`);
    }
  }
  if (input.resolutionType !== undefined) {
    setClauses.push(`resolution_type = :resolutionType`);
    replacements.resolutionType = input.resolutionType;
  }
  if (input.animalType !== undefined) {
    setClauses.push(`animal_type = :animalType`);
    replacements.animalType = input.animalType;
  }
  if (input.urgencyLevel !== undefined) {
    setClauses.push(`urgency_level = :urgencyLevel`);
    replacements.urgencyLevel = input.urgencyLevel;
  }
  if (input.description !== undefined) {
    setClauses.push(`description = :description`);
    replacements.description = input.description;
  }
  if (input.title !== undefined) {
    setClauses.push(`title = :title`);
    replacements.title = input.title;
  }
  if (input.animalCondition !== undefined) {
    setClauses.push(`animal_condition = :animalCondition`);
    replacements.animalCondition = input.animalCondition;
  }
  if (input.phoneContact !== undefined) {
    setClauses.push(`phone_contact = :phoneContact`);
    replacements.phoneContact = input.phoneContact;
  }
  if (input.locationText !== undefined) {
    setClauses.push(`location_text = :locationText`);
    replacements.locationText = input.locationText;
  }

  if (input.referenceNote !== undefined) {
    setClauses.push(`reference_note = :referenceNote`);
    replacements.referenceNote = input.referenceNote;
  }
  if (input.animalSex !== undefined) {
    setClauses.push(`animal_sex = :animalSex`);
    replacements.animalSex = input.animalSex;
  }
  if (input.animalSize !== undefined) {
    setClauses.push(`animal_size = :animalSize`);
    replacements.animalSize = input.animalSize;
  }
  if (input.animalColor !== undefined) {
    setClauses.push(`animal_color = :animalColor`);
    replacements.animalColor = input.animalColor;
  }
  if (input.whereabouts !== undefined) {
    setClauses.push(`whereabouts = :whereabouts`);
    replacements.whereabouts = input.whereabouts;
  }
  setClauses.push(`updated_at = NOW()`);

  const rows = await sequelize.query<CaseRow>(
    `UPDATE cases SET ${setClauses.join(', ')}
     WHERE id = :id
     RETURNING
       id,
       user_id AS "userId",
       listing_type AS "listingType",
       animal_type AS "animalType",
       description,
       status,
       resolution_type AS "resolutionType",
       urgency_level AS "urgencyLevel",
       ST_Y(location) AS lat,
       ST_X(location) AS lng,
       location_text AS "locationText",
       reference_note AS "referenceNote",
       title,
       public_code AS "publicCode",
       animal_condition AS "animalCondition",
       seen_at AS "seenAt",
       animal_sex AS "animalSex",
       animal_size AS "animalSize",
       animal_color AS "animalColor",
       whereabouts,
       created_at AS "createdAt",
       updated_at AS "updatedAt",
       resolved_at AS "resolvedAt"`,
    { replacements, type: QueryTypes.SELECT },
  );

  return rows[0] ?? null;
}

export interface FeedCaseRow {
  id: string;
  listingType: string;
  title: string;
  animalType: string;
  locationText: string | null;
  urgencyLevel: number;
  createdAt: Date;
  // Never null, same as CaseDetail.publisherName
  publisherName: string;
  volunteerCount: number;
  heroUrl: string | null;
}

// The raw feed row before normalization: u.name arrives nullable and the count
// arrives as a string from Postgres
type FeedCaseDbRow = Omit<FeedCaseRow, 'publisherName'> & { publisherName: string | null };

// The feed is what fills the "urgent cases" strip on the home screen, so it is
// capped by age: a case flagged critical long ago was either resolved without
// anyone closing it or abandoned, and showing it as urgent today teaches people
// that the urgency badge means nothing. Cases older than this still exist and
// are still listed — they just stop being urgent.
//
// Six months and not something tighter because during the pilot the only data
// is seeded test cases, and the oldest is around 113 days: a 30-day cap emptied
// the strip completely. Worth tightening once there is real traffic, where a
// case that nobody touched in a month really is stale.
export const FEED_MAX_AGE_DAYS = 180;

export async function getFeedCases(query: FeedCasesQuery): Promise<FeedCaseRow[]> {
  const { lat, lng, radius, listingType } = query;

  const conditions: string[] = [
    `c.status IN ('abierto', 'en_rescate')`,
    `c.created_at > NOW() - (:maxAgeDays * INTERVAL '1 day')`,
    `ST_DWithin(
       c.location::geography,
       ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
       :radiusM
     )`,
    // Un animal que ya esta a resguardo no es urgente, por mas alta que sea
    // la urgencia con la que se publico. El feed no tiene toggle "sheltered"
    // como el listado, asi que se excluyen directamente en vez de mostrarlos.
    `c.whereabouts NOT IN ('con_quien_publica', 'con_un_tercero')`,
  ];
  const replacements: Record<string, unknown> = {
    lat,
    lng,
    radiusM: radius * 1000,
    maxAgeDays: FEED_MAX_AGE_DAYS,
  };

  if (listingType) {
    conditions.push(`c.listing_type = :listingType`);
    replacements.listingType = listingType;
  }

  const orderBy = buildFeedOrderBy(listingType);

  const rows = await sequelize.query<FeedCaseDbRow>(
    `SELECT
       c.id,
       c.listing_type AS "listingType",
       c.title,
       c.animal_type AS "animalType",
       c.location_text AS "locationText",
       c.urgency_level AS "urgencyLevel",
       c.created_at AS "createdAt",
       u.name AS "publisherName",
       ${FEED_VOLUNTEER_COUNT_EXPR} AS "volunteerCount",
       ${HERO_URL_SELECT}
     FROM cases c
     LEFT JOIN users u ON c.user_id = u.id
     LEFT JOIN contacts co ON co.case_id = c.id
     WHERE ${conditions.join(' AND ')}
     GROUP BY c.id, u.name
     ORDER BY ${orderBy}
     LIMIT 15`,
    { replacements, type: QueryTypes.SELECT },
  );
  return rows.map((r) => ({
    ...r,
    publisherName: resolvePublisherName(r.publisherName),
    volunteerCount: Number(r.volunteerCount),
  }));
}

export async function addCaseUpdate(
  caseId: string,
  userId: string,
  input: AddUpdateInput,
): Promise<CaseUpdateRow> {
  const existing = await Case.findByPk(caseId, { attributes: ['id', 'userId'] });
  if (!existing) {
    throw Object.assign(new Error('Caso no encontrado'), { code: 'CASE_NOT_FOUND', status: 404 });
  }

  if (existing.userId !== userId) {
    throw Object.assign(new Error('Solo el autor del caso puede agregar novedades'), {
      code: 'FORBIDDEN',
      status: 403,
    });
  }

  const update = await CaseUpdate.create({
    caseId,
    userId,
    updateType: input.updateType,
    content: input.content ?? null,
    hostName: input.hostName ?? null,
  });

  // El paradero del caso lo mueve la linea de tiempo, no un formulario aparte. Al
  // publicar, un caso buscado queda siempre en 'desconocido' (deriveWhereabouts) y
  // hasta aca no habia ninguna pantalla que lo destrabara: el animal aparecia y la
  // ficha seguia diciendo que nadie sabia donde estaba. Contar que cambio de lugar
  // es exactamente el momento en que ese dato cambia.
  if (input.whereabouts !== undefined) {
    await Case.update({ whereabouts: input.whereabouts }, { where: { id: caseId } });
  }

  return update.toJSON() as CaseUpdateRow;
}

export { getZoneStats } from './cases.zone-stats';
export type { ZoneStatsQuery, ZoneStats } from './cases.zone-stats';
