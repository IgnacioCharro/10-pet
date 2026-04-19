import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

export type UpdateType = 'status_change' | 'comment' | 'photo_added' | 'reactivated';

interface CaseUpdateAttributes {
  id: string;
  caseId: string;
  userId: string;
  updateType: UpdateType;
  content: string | null;
  createdAt: Date;
}

type CaseUpdateCreationAttributes = Optional<
  CaseUpdateAttributes,
  'id' | 'content' | 'createdAt'
>;

export class CaseUpdate
  extends Model<CaseUpdateAttributes, CaseUpdateCreationAttributes>
  implements CaseUpdateAttributes
{
  declare id: string;
  declare caseId: string;
  declare userId: string;
  declare updateType: UpdateType;
  declare content: string | null;
  declare readonly createdAt: Date;

  static initModel(sequelize: Sequelize): typeof CaseUpdate {
    CaseUpdate.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        caseId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        updateType: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        content: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: 'case_updates',
        underscored: true,
        timestamps: true,
        updatedAt: false,
      },
    );
    return CaseUpdate;
  }
}
