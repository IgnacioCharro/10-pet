import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../db';
import { RefreshToken } from '../../../db';
import { ListUsersQuery, PatchAdminUserInput, PatchAdminCaseInput } from './admin.validators';

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

export async function banUser(
  userId: string,
  input: PatchAdminUserInput,
): Promise<{ ok: true } | { error: { code: string; message: string; status: number } }> {
  const [user] = await sequelize.query<{ id: string }>(
    `SELECT id FROM users WHERE id = :userId`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );

  if (!user) {
    return { error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado', status: 404 } };
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

  const newStatus = input.action === 'delete' ? 'eliminado' : 'abierto';
  await sequelize.query(
    `UPDATE cases SET status = :status, updated_at = NOW() WHERE id = :caseId`,
    { replacements: { status: newStatus, caseId }, type: QueryTypes.UPDATE },
  );

  return { ok: true };
}
