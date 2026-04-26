import { QueryTypes } from 'sequelize';
import { sequelize } from '../../../db';
import type { CreateVetAssistanceInput } from './vet-assistances.validators';

export interface VetAssistanceRow {
  id: string;
  caseId: string;
  userId: string;
  userName: string | null;
  isVet: boolean;
  procedure: string | null;
  medication: string | null;
  attendedAt: Date | null;
  createdAt: Date;
}

export async function getVetAssistances(caseId: string): Promise<VetAssistanceRow[]> {
  return sequelize.query<VetAssistanceRow>(
    `SELECT
       va.id,
       va.case_id AS "caseId",
       va.user_id AS "userId",
       u.name AS "userName",
       u.is_vet AS "isVet",
       va.procedure,
       va.medication,
       va.attended_at AS "attendedAt",
       va.created_at AS "createdAt"
     FROM vet_assistances va
     LEFT JOIN users u ON va.user_id = u.id
     WHERE va.case_id = :caseId
     ORDER BY va.created_at DESC`,
    { replacements: { caseId }, type: QueryTypes.SELECT },
  );
}

export async function createVetAssistance(
  caseId: string,
  userId: string,
  input: CreateVetAssistanceInput,
): Promise<VetAssistanceRow> {
  const rows = await sequelize.query<VetAssistanceRow>(
    `INSERT INTO vet_assistances
       (id, case_id, user_id, procedure, medication, attended_at, created_at, updated_at)
     VALUES
       (gen_random_uuid(), :caseId, :userId, :procedure, :medication, :attendedAt, NOW(), NOW())
     RETURNING
       id,
       case_id AS "caseId",
       user_id AS "userId",
       procedure,
       medication,
       attended_at AS "attendedAt",
       created_at AS "createdAt"`,
    {
      replacements: {
        caseId,
        userId,
        procedure: input.procedure ?? null,
        medication: input.medication ?? null,
        attendedAt: input.attendedAt ?? null,
      },
      type: QueryTypes.SELECT,
    },
  );

  const row = rows[0];

  const [user] = await sequelize.query<{ name: string | null; isVet: boolean }>(
    `SELECT name, is_vet AS "isVet" FROM users WHERE id = :userId`,
    { replacements: { userId }, type: QueryTypes.SELECT },
  );

  return { ...row, userName: user?.name ?? null, isVet: user?.isVet ?? false };
}
