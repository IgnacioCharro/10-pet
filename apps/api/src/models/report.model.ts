import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

export type ReportReason = 'spam' | 'contenido_inapropiado' | 'falso' | 'acoso' | 'otro';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned';

interface ReportAttributes {
  id: string;
  reporterId: string;
  targetCaseId: string | null;
  targetUserId: string | null;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  reviewedAt: Date | null;
  createdAt: Date;
}

type ReportCreationAttributes = Optional<
  ReportAttributes,
  'id' | 'targetCaseId' | 'targetUserId' | 'description' | 'status' | 'reviewedAt' | 'createdAt'
>;

export class Report
  extends Model<ReportAttributes, ReportCreationAttributes>
  implements ReportAttributes
{
  declare id: string;
  declare reporterId: string;
  declare targetCaseId: string | null;
  declare targetUserId: string | null;
  declare reason: ReportReason;
  declare description: string | null;
  declare status: ReportStatus;
  declare reviewedAt: Date | null;
  declare createdAt: Date;

  static initModel(sequelize: Sequelize): void {
    Report.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        reporterId: { type: DataTypes.UUID, allowNull: false },
        targetCaseId: { type: DataTypes.UUID, allowNull: true },
        targetUserId: { type: DataTypes.UUID, allowNull: true },
        reason: { type: DataTypes.STRING(50), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        status: { type: DataTypes.STRING(50), defaultValue: 'pending' },
        reviewedAt: { type: DataTypes.DATE, allowNull: true },
        createdAt: { type: DataTypes.DATE },
      },
      {
        sequelize,
        tableName: 'reports',
        underscored: true,
        timestamps: true,
        updatedAt: false,
      },
    );
  }
}
