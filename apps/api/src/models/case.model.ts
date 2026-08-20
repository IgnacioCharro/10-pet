import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

export type AnimalType = 'perro' | 'gato' | 'caballo' | 'vaca' | 'ave' | 'otro';
export type AnimalCondition = 'herido' | 'sano' | 'asustado' | 'debil' | 'no_pude_acercarme';
export type CaseStatus = 'abierto' | 'en_rescate' | 'resuelto' | 'inactivo' | 'spam' | 'archivado';
export type ResolutionType = 'rescatado' | 'adoptado' | 'fallecido' | 'sin_novedad';
export type Whereabouts =
  | 'en_la_calle' | 'con_quien_publica' | 'con_un_tercero' | 'desconocido';

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
  referenceNote: string | null;
  title: string;
  publicCode: string;
  animalCondition: AnimalCondition | null;
  whereabouts: Whereabouts;
  seenAt: Date | null;
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
  | 'referenceNote'
  | 'publicCode'
  | 'animalCondition'
  | 'whereabouts'
  | 'seenAt'
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
  declare referenceNote: string | null;
  declare title: string;
  declare readonly publicCode: string;
  declare animalCondition: AnimalCondition | null;
  declare whereabouts: Whereabouts;
  declare seenAt: Date | null;
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
        referenceNote: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        title: {
          type: DataTypes.STRING(120),
          allowNull: false,
        },
        publicCode: {
          // Lo genera Postgres con una secuencia; el modelo nunca lo escribe.
          type: DataTypes.STRING(12),
          allowNull: false,
        },
        animalCondition: {
          type: DataTypes.STRING(20),
          allowNull: true,
        },
        whereabouts: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'en_la_calle',
        },
        seenAt: {
          type: DataTypes.DATE,
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
