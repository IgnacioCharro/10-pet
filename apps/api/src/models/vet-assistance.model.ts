import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

interface VetAssistanceAttributes {
  id: string;
  caseId: string;
  userId: string;
  procedure: string | null;
  medication: string | null;
  attendedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type VetAssistanceCreationAttributes = Optional<
  VetAssistanceAttributes,
  'id' | 'procedure' | 'medication' | 'attendedAt' | 'createdAt' | 'updatedAt'
>;

export class VetAssistance
  extends Model<VetAssistanceAttributes, VetAssistanceCreationAttributes>
  implements VetAssistanceAttributes
{
  declare id: string;
  declare caseId: string;
  declare userId: string;
  declare procedure: string | null;
  declare medication: string | null;
  declare attendedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof VetAssistance {
    VetAssistance.init(
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
        procedure: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        medication: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        attendedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: 'vet_assistances',
        underscored: true,
      },
    );
    return VetAssistance;
  }
}
