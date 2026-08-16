import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../db';
import { RefreshToken } from '../../../db';
import { ListUsersQuery, PatchAdminUserInput, PatchAdminCaseInput, ListAdminCasesQuery } from './admin.validators';
import { isAdminEmail, isVetForRole, type UserRole } from './admin.roles';

export interface AdminStats {
  totalUsers: number;
  newUsersLast7d: number;
  totalCases: number;
  newCasesLast7d: number;
  casesByStatus: Record<string, number>;
  pendingReports: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  emailVerified: boolean;
  bannedAt: Date | null;
  casesCount: number;
  createdAt: Date;
}

export async function getAdminStats(): Promise<AdminStats> {
  const [{ total_users, new_users_7d }] = await sequelize.query<{
    total_users: string;
    new_users_7d: string;
  }>(
    `SELECT
       COUNT(*) AS total_users,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS new_users_7d
     FROM users`,
    { type: QueryTypes.SELECT },
  );

  const [{ total_cases, new_cases_7d }] = await sequelize.query<{
    total_cases: string;
    new_cases_7d: string;
  }>(
    `SELECT
       COUNT(*) AS total_cases,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS new_cases_7d
     FROM cases`,
    { type: QueryTypes.SELECT },
  );

  const statusRows = await sequelize.query<{ status: string; count: string }>(
    `SELECT status, COUNT(*) AS count FROM cases GROUP BY status`,
    { type: QueryTypes.SELECT },
  );

  const [{ pending_reports }] = await sequelize.query<{ pending_reports: string }>(
    `SELECT COUNT(*) AS pending_reports FROM reports WHERE status = 'pending'`,
    { type: QueryTypes.SELECT },
  );

  const casesByStatus: Record<string, number> = {};
  for (const row of statusRows) {
    casesByStatus[row.status] = parseInt(row.count, 10);
  }

  return {
    totalUsers: parseInt(total_users, 10),
    newUsersLast7d: parseInt(new_users_7d, 10),
    totalCases: parseInt(total_cases, 10),
    newCasesLast7d: parseInt(new_cases_7d, 10),
    casesByStatus,
    pendingReports: parseInt(pending_reports, 10),
  };
}

export async function listAdminUsers(
  query: ListUsersQuery,
): Promise<{ users: AdminUserRow[]; total: number }> {
  const conditions: string[] = [];
  const replacements: Record<string, unknown> = {};

  if (query.search) {
    conditions.push(`(u.email ILIKE :search OR u.name ILIKE :search)`);
    replacements.search = `%${query.search}%`;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (query.page - 1) * query.limit;
  replacements.limit = query.limit;
  replacements.offset = offset;

  const [{ count }] = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM users u ${where}`,
    { replacements, type: QueryTypes.SELECT },
  );

  const users = await sequelize.query<AdminUserRow>(
    `SELECT
       u.id,
       u.email,
       u.name,
       u.role,
       u.email_verified AS "emailVerified",
       u.banned_at AS "bannedAt",
       u.created_at AS "createdAt",
       COUNT(c.id)::int AS "casesCount"
     FROM users u
     LEFT JOIN cases c ON c.user_id = u.id
     ${where}
     GROUP BY u.id
     ORDER BY u.created_at DESC
     LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT },
  );

  return { users, total: parseInt(count, 10) };
}

export interface AdminUserCaseRow {
  id: string;
  animalType: string;
  status: string;
  createdAt: Date;
}

export interface AdminUserDetail {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    isVet: boolean;
    vetLicense: string | null;
    emailVerified: boolean;
    bannedAt: Date | null;
    createdAt: Date;
  };
  counts: { cases: number; contactsInitiated: number; contactsReceived: number };
  recentCases: AdminUserCaseRow[];
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const [user] = await sequelize.query<AdminUserDetail['user']>(
    `SELECT id, email, name, role,
            is_vet AS "isVet", vet_license AS "vetLicense",
            email_verified AS "emailVerified", banned_at AS "bannedAt",
            created_at AS "createdAt"
     FROM users WHERE id = :userId`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );

  if (!user) return null;

  const [counts] = await sequelize.query<{
    cases: string;
    contactsInitiated: string;
    contactsReceived: string;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM cases WHERE user_id = :userId) AS cases,
       (SELECT COUNT(*) FROM contacts WHERE initiator_id = :userId) AS "contactsInitiated",
       (SELECT COUNT(*) FROM contacts WHERE responder_id = :userId) AS "contactsReceived"`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );

  const recentCases = await sequelize.query<AdminUserCaseRow>(
    `SELECT id, animal_type AS "animalType", status, created_at AS "createdAt"
     FROM cases WHERE user_id = :userId
     ORDER BY created_at DESC LIMIT 5`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );

  return {
    user,
    counts: {
      cases: parseInt(counts.cases, 10),
      contactsInitiated: parseInt(counts.contactsInitiated, 10),
      contactsReceived: parseInt(counts.contactsReceived, 10),
    },
    recentCases,
  };
}

export async function patchAdminUser(
  userId: string,
  input: PatchAdminUserInput,
): Promise<{ ok: true } | { error: { code: string; message: string; status: number } }> {
  const [user] = await sequelize.query<{ id: string; email: string }>(
    `SELECT id, email FROM users WHERE id = :userId`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );

  if (!user) {
    return { error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado', status: 404 } };
  }

  if (input.action === 'set_role') {
    // La etiqueta no puede contradecir al permiso: quien entra al panel lo decide
    // ADMIN_EMAILS, no esta columna.
    if (isAdminEmail(user.email, process.env['ADMIN_EMAILS'])) {
      return {
        error: {
          code: 'ADMIN_ROLE_LOCKED',
          message: 'No se puede cambiar el rol de un administrador',
          status: 409,
        },
      };
    }
    // is_vet se escribe en el mismo UPDATE: los dos campos no pueden divergir.
    await sequelize.query(
      `UPDATE users SET role = :role, is_vet = :isVet, updated_at = NOW() WHERE id = :userId`,
      {
        replacements: { role: input.role, isVet: isVetForRole(input.role), userId },
        type: QueryTypes.UPDATE,
      },
    );
    return { ok: true };
  }

  if (input.action === 'ban') {
    await sequelize.query(
      `UPDATE users SET banned_at = NOW() WHERE id = :userId`,
      { replacements: { userId }, type: QueryTypes.UPDATE },
    );
    // Revoke all refresh tokens so they can't get new access tokens
    await RefreshToken.destroy({ where: { userId } });
  } else {
    await sequelize.query(
      `UPDATE users SET banned_at = NULL WHERE id = :userId`,
      { replacements: { userId }, type: QueryTypes.UPDATE },
    );
  }

  return { ok: true };
}

export async function patchAdminCase(
  caseId: string,
  input: PatchAdminCaseInput,
): Promise<{ ok: true } | { error: { code: string; message: string; status: number } }> {
  const [caseRow] = await sequelize.query<{ id: string }>(
    `SELECT id FROM cases WHERE id = :caseId`,
    { replacements: { caseId }, type: QueryTypes.SELECT },
  );

  if (!caseRow) {
    return { error: { code: 'CASE_NOT_FOUND', message: 'Caso no encontrado', status: 404 } };
  }

  const newStatus =
    input.action === 'delete' ? 'eliminado' :
    input.action === 'archive' ? 'archivado' :
    'abierto';
  await sequelize.query(
    `UPDATE cases SET status = :status, updated_at = NOW() WHERE id = :caseId`,
    { replacements: { status: newStatus, caseId }, type: QueryTypes.UPDATE },
  );

  return { ok: true };
}

export interface AdminCaseRow {
  id: string;
  animalType: string;
  locationText: string | null;
  status: string;
  urgencyLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function listAdminCases(
  query: ListAdminCasesQuery,
): Promise<{ cases: AdminCaseRow[]; total: number }> {
  const offset = (query.page - 1) * query.limit;
  const replacements = { status: query.status, limit: query.limit, offset };

  const [{ count }] = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM cases WHERE status = :status`,
    { replacements, type: QueryTypes.SELECT },
  );

  const cases = await sequelize.query<AdminCaseRow>(
    `SELECT
       id,
       animal_type AS "animalType",
       location_text AS "locationText",
       status,
       urgency_level AS "urgencyLevel",
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM cases
     WHERE status = :status
     ORDER BY updated_at DESC
     LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT },
  );

  return { cases, total: parseInt(count, 10) };
}
