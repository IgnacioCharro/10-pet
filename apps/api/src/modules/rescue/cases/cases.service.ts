import { QueryTypes } from 'sequelize';
import { sequelize, Case, CaseImage, CaseUpdate } from '../../../db';
import {
  CreateCaseInput,
  ListCasesQuery,
  NearbyCasesQuery,
  FeedCasesQuery,
  UpdateCaseInput,
  AddUpdateInput,
} from './cases.validators';
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
  condition: string | null;
  animalSex: string | null;
  animalSize: string | null;
  animalColor: string | null;
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
  createdAt: Date;
}

export interface CaseDetail extends CaseRow {
  images: CaseImageRow[];
  updates: CaseUpdateRow[];
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
  c.condition,
  c.animal_sex AS "animalSex",
  c.animal_size AS "animalSize",
  c.animal_color AS "animalColor",
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
       (id, user_id, listing_type, animal_type, description, status, urgency_level,
        location, location_text, condition, phone_contact,
        animal_sex, animal_size, animal_color,
        created_at, updated_at)
     VALUES
       (gen_random_uuid(), :userId, :listingType, :animalType, :description, 'abierto', :urgencyLevel,
        ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), :locationText, :condition, :phoneContact,
        :animalSex, :animalSize, :animalColor,
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
       condition,
       animal_sex AS "animalSex",
       animal_size AS "animalSize",
       animal_color AS "animalColor",
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
        condition: input.condition ?? null,
        phoneContact: input.phoneContact ?? null,
        animalSex: input.animalSex ?? null,
        animalSize: input.animalSize ?? null,
        animalColor: input.animalColor ?? null,
      },
      type: QueryTypes.SELECT,
    },
  );

  const newCase = result[0];

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
    animalSex, animalSize, animalColor,
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

  let orderBy = 'c.created_at DESC';
  if (sort === 'urgency') orderBy = 'c.urgency_level DESC, c.created_at DESC';
  if (sort === 'distance' && lat !== undefined) orderBy = 'distance_km ASC NULLS LAST';

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
  const rows = await sequelize.query<CaseRow>(
    `SELECT ${BASE_CASE_SELECT}
     FROM cases c
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
    attributes: ['id', 'userId', 'updateType', 'content', 'createdAt'],
  });

  return {
    ...caseRow,
    images: images.map((img) => img.toJSON() as CaseImageRow),
    updates: updates.map((u) => u.toJSON() as CaseUpdateRow),
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
  if (input.condition !== undefined) {
    setClauses.push(`condition = :condition`);
    replacements.condition = input.condition;
  }
  if (input.phoneContact !== undefined) {
    setClauses.push(`phone_contact = :phoneContact`);
    replacements.phoneContact = input.phoneContact;
  }
  if (input.locationText !== undefined) {
    setClauses.push(`location_text = :locationText`);
    replacements.locationText = input.locationText;
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
       condition,
       animal_sex AS "animalSex",
       animal_size AS "animalSize",
       animal_color AS "animalColor",
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
  animalType: string;
  locationText: string | null;
  urgencyLevel: number;
  createdAt: Date;
  publisherName: string | null;
  volunteerCount: number;
}

export async function getFeedCases(query: FeedCasesQuery): Promise<FeedCaseRow[]> {
  const { lat, lng, radius, listingType } = query;

  const conditions: string[] = [
    `c.status IN ('abierto', 'en_rescate')`,
    `ST_DWithin(
       c.location::geography,
       ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
       :radiusM
     )`,
  ];
  const replacements: Record<string, unknown> = { lat, lng, radiusM: radius * 1000 };

  if (listingType) {
    conditions.push(`c.listing_type = :listingType`);
    replacements.listingType = listingType;
  }

  // lost cases: most recent first; found cases (or all): urgency then recency
  const orderBy = listingType === 'lost'
    ? 'c.created_at DESC'
    : 'c.urgency_level DESC, c.created_at DESC';

  const rows = await sequelize.query<FeedCaseRow>(
    `SELECT
       c.id,
       c.listing_type AS "listingType",
       c.animal_type AS "animalType",
       c.location_text AS "locationText",
       c.urgency_level AS "urgencyLevel",
       c.created_at AS "createdAt",
       u.name AS "publisherName",
       COUNT(co.id) FILTER (WHERE co.status IN ('active', 'completed')) AS "volunteerCount"
     FROM cases c
     LEFT JOIN users u ON c.user_id = u.id
     LEFT JOIN contacts co ON co.case_id = c.id
     WHERE ${conditions.join(' AND ')}
     GROUP BY c.id, u.name
     ORDER BY ${orderBy}
     LIMIT 10`,
    { replacements, type: QueryTypes.SELECT },
  );
  return rows.map((r) => ({ ...r, volunteerCount: Number(r.volunteerCount) }));
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
  });

  return update.toJSON() as CaseUpdateRow;
}
