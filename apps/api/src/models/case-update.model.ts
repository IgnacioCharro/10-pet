import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

// Los cuatro primeros son legacy: siguen existiendo en la base y hay que renderizarlos,
// pero no se ofrecen al crear una novedad.
// 'medicacion' se dio de baja en 20260814100000, absorbido por 'veterinario'.
// Cualquier cambio a esta lista necesita migration: hay un CHECK espejo en Postgres.
export type UpdateType =
  | 'status_change' | 'comment' | 'photo_added' | 'reactivated'
  | 'avistamiento' | 'alojamiento' | 'salud' | 'veterinario' | 'comentario';

interface CaseUpdateAttributes {
  id: string;
  caseId: string;
  userId: string;
  updateType: UpdateType;
  content: string | null;
  /** Quien aloja al animal. Solo tiene sentido en las novedades de tipo 'alojamiento'. */
  hostName: string | null;
  createdAt: Date;
}

type CaseUpdateCreationAttributes = Optional<
  CaseUpdateAttributes,
  'id' | 'content' | 'hostName' | 'createdAt'
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
  declare hostName: string | null;
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
        hostName: {
          type: DataTypes.STRING(100),
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
