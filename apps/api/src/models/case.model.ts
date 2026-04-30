import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

export type AnimalType = 'perro' | 'gato' | 'otro';
export type CaseStatus = 'abierto' | 'en_rescate' | 'resuelto' | 'inactivo' | 'spam' | 'archivado';
export type ResolutionType = 'rescatado' | 'adoptado' | 'fallecido' | 'sin_novedad';

export interface CaseLocation {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

interface CaseAttributes {
  id: string;
  userId: string;
  animalType: AnimalType;
  description: string;
  status: CaseStatus;
  resolutionType: ResolutionType | null;
  urgencyLevel: number;
  location: CaseLocation;
  locationText: string | null;
  condition: string | null;
  phoneContact: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}

type CaseCreationAttributes = Optional<
  CaseAttributes,
  | 'id'
  | 'status'
  | 'resolutionType'
  | 'urgencyLevel'
  | 'locationText'
  | 'condition'
  | 'phoneContact'
  | 'createdAt'
  | 'updatedAt'
  | 'resolvedAt'
>;

export class Case
  extends Model<CaseAttributes, CaseCreationAttributes>
  implements CaseAttributes
{
  declare id: string;
  declare userId: string;
  declare animalType: AnimalType;
  declare description: string;
  declare status: CaseStatus;
  declare resolutionType: ResolutionType | null;
  declare urgencyLevel: number;
  declare location: CaseLocation;
  declare locationText: string | null;
  declare condition: string | null;
  declare phoneContact: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare resolvedAt: Date | null;

  static initModel(sequelize: Sequelize): typeof Case {
    Case.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        animalType: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        status: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: 'abierto',
        },
        resolutionType: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        urgencyLevel: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        location: {
          // Stored as GEOMETRY(Point, 4326) in DB; pg returns GeoJSON
          type: DataTypes.GEOMETRY('POINT', 4326),
          allowNull: false,
        },
        locationText: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        condition: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        phoneContact: {
          type: DataTypes.STRING(20),
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
        resolvedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'cases',
        underscored: true,
      },
    );
    return Case;
  }
}
