import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../db';
import { CreateReportInput, ListReportsQuery, UpdateReportInput } from './reports.validators';

export interface ReportRow {
  id: string;
  reporterId: string;
  targetCaseId: string | null;
  targetUserId: string | null;
  reason: string;
  description: string | null;
  status: string;
  reviewedAt: Date | null;
  createdAt: Date;
}

export async function createCaseReport(
  reporterId: string,
  caseId: string,
  input: CreateReportInput,
): Promise<ReportRow | { error: { code: string; message: string; status: number } }> {
  const [caseRow] = await sequelize.query<{ id: string; userId: string }>(
    `SELECT id, user_id AS "userId" FROM cases WHERE id = :caseId`,
    { replacements: { caseId }, type: QueryTypes.SELECT },
  );

  if (!caseRow) {
    return { error: { code: 'CASE_NOT_FOUND', message: 'Caso no encontrado', status: 404 } };
  }
  if (caseRow.userId === reporterId) {
    return { error: { code: 'OWN_CASE', message: 'No podés reportar tu propio caso', status: 400 } };
  }

  // Check for duplicate report from same user within 24h
  const [existing] = await sequelize.query<{ id: string }>(
    `SELECT id FROM reports
     WHERE reporter_id = :reporterId
       AND target_case_id = :caseId
       AND created_at > NOW() - INTERVAL '24 hours'`,
    { replacements: { reporterId, caseId }, type: QueryTypes.SELECT },
  );

  if (existing) {
    return { error: { code: 'ALREADY_REPORTED', message: 'Ya reportaste este caso recientemente', status: 409 } };
  }

  const [report] = await sequelize.query<ReportRow>(
    `INSERT INTO reports
       (id, reporter_id, target_case_id, target_user_id, reason, description, status, created_at)
     VALUES
       (gen_random_uuid(), :reporterId, :caseId, NULL, :reason, :description, 'pending', NOW())
     RETURNING
       id,
       reporter_id AS "reporterId",
       target_case_id AS "targetCaseId",
       target_user_id AS "targetUserId",
       reason,
       description,
       status,
       reviewed_at AS "reviewedAt",
       created_at AS "createdAt"`,
    {
      replacements: { reporterId, caseId, reason: input.reason, description: input.description ?? null },
      type: QueryTypes.SELECT,
    },
  );

  // Auto-mark case as spam if threshold reached (5 pending reports)
  const [{ count }] = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM reports WHERE target_case_id = :caseId AND status = 'pending'`,
    { replacements: { caseId }, type: QueryTypes.SELECT },
  );

  if (parseInt(count, 10) >= 5) {
    await sequelize.query(
      `UPDATE cases SET status = 'spam', updated_at = NOW() WHERE id = :caseId AND status != 'spam'`,
      { replacements: { caseId }, type: QueryTypes.UPDATE },
    );
  }

  return report;
}

export async function listReports(
  query: ListReportsQuery,
): Promise<{ reports: ReportRow[]; total: number }> {
  const conditions: string[] = [];
  const replacements: Record<string, unknown> = {};

  if (query.status) {
    conditions.push('r.status = :status');
    replacements.status = query.status;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (query.page - 1) * query.limit;
  replacements.limit = query.limit;
  replacements.offset = offset;

  const [{ count }] = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM reports r ${where}`,
    { replacements, type: QueryTypes.SELECT },
  );

  const reports = await sequelize.query<ReportRow>(
    `SELECT
       r.id,
       r.reporter_id AS "reporterId",
       r.target_case_id AS "targetCaseId",
       r.target_user_id AS "targetUserId",
       r.reason,
       r.description,
       r.status,
       r.reviewed_at AS "reviewedAt",
       r.created_at AS "createdAt"
     FROM reports r
     ${where}
     ORDER BY r.created_at DESC
     LIMIT :limit OFFSET :offset`,
    { replacements, type: QueryTypes.SELECT },
  );

  return { reports, total: parseInt(count, 10) };
}

export async function updateReport(
  reportId: string,
  input: UpdateReportInput,
): Promise<ReportRow | { error: { code: string; message: string; status: number } }> {
  const [report] = await sequelize.query<ReportRow>(
    `UPDATE reports
     SET status = :status, reviewed_at = NOW()
     WHERE id = :reportId
     RETURNING
       id,
       reporter_id AS "reporterId",
       target_case_id AS "targetCaseId",
       target_user_id AS "targetUserId",
       reason,
       description,
       status,
       reviewed_at AS "reviewedAt",
       created_at AS "createdAt"`,
    { replacements: { status: input.status, reportId }, type: QueryTypes.SELECT },
  );

  if (!report) {
    return { error: { code: 'NOT_FOUND', message: 'Reporte no encontrado', status: 404 } };
  }

  return report;
}
