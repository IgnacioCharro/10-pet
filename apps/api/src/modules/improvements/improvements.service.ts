import { QueryTypes } from 'sequelize';
import { sequelize } from '../../db';
import { CreateImprovementInput } from './improvements.validators';

export interface ImprovementRow {
  id: string;
  userId: string;
  note: string;
  route: string | null;
  userAgent: string | null;
  status: string;
  resolutionNotes: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

export async function createImprovement(
  userId: string,
  input: CreateImprovementInput,
): Promise<ImprovementRow> {
  const [improvement] = await sequelize.query<ImprovementRow>(
    `INSERT INTO improvements
       (id, user_id, note, route, user_agent, status, created_at)
     VALUES
       (gen_random_uuid(), :userId, :note, :route, :userAgent, 'pending', NOW())
     RETURNING
       id,
       user_id AS "userId",
       note,
       route,
       user_agent AS "userAgent",
       status,
       resolution_notes AS "resolutionNotes",
       created_at AS "createdAt",
       resolved_at AS "resolvedAt"`,
    {
      replacements: {
        userId,
        note: input.note,
        route: input.route ?? null,
        userAgent: input.userAgent ?? null,
      },
      type: QueryTypes.SELECT,
    },
  );

  return improvement;
}
