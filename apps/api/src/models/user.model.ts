import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import type { UserRole } from '../modules/moderation/admin/admin.roles';

interface UserAttributes {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  emailVerified: boolean;
  emailVerificationToken: string | null;
  emailVerificationTokenExpiresAt: Date | null;
  googleId: string | null;
  pushToken: string | null;
  isVet: boolean;
  vetLicense: string | null;
  /** Etiqueta, no permiso: el acceso al panel sigue saliendo de ADMIN_EMAILS. */
  role: UserRole;
  bannedAt: Date | null;
  passwordResetToken: string | null;
  passwordResetExpiresAt: Date | null;
  notificationLat: number | null;
  notificationLng: number | null;
  notificationRadiusKm: number | null;
  createdAt: Date;
  updatedAt: Date;
}

type UserCreationAttributes = Optional<
  UserAttributes,
  | 'id'
  | 'name'
  | 'passwordHash'
  | 'emailVerified'
  | 'emailVerificationToken'
  | 'emailVerificationTokenExpiresAt'
  | 'googleId'
  | 'pushToken'
  | 'isVet'
  | 'vetLicense'
  | 'role'
  | 'bannedAt'
  | 'passwordResetToken'
  | 'passwordResetExpiresAt'
  | 'notificationLat'
  | 'notificationLng'
  | 'notificationRadiusKm'
  | 'createdAt'
  | 'updatedAt'
>;

export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  declare id: string;
  declare email: string;
  declare name: string | null;
  declare passwordHash: string | null;
  declare emailVerified: boolean;
  declare emailVerificationToken: string | null;
  declare emailVerificationTokenExpiresAt: Date | null;
  declare googleId: string | null;
  declare pushToken: string | null;
  declare isVet: boolean;
  declare vetLicense: string | null;
  declare role: UserRole;
  declare bannedAt: Date | null;
  declare passwordResetToken: string | null;
  declare passwordResetExpiresAt: Date | null;
  declare notificationLat: number | null;
  declare notificationLng: number | null;
  declare notificationRadiusKm: number | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof User {
    User.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        passwordHash: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        emailVerified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        emailVerificationToken: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        emailVerificationTokenExpiresAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        googleId: {
          type: DataTypes.STRING(255),
          allowNull: true,
          unique: true,
        },
        pushToken: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        isVet: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        vetLicense: {
          type: DataTypes.STRING(50),
          allowNull: true,
        },
        role: {
          type: DataTypes.TEXT,
          allowNull: false,
          defaultValue: 'comun',
        },
        bannedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        passwordResetToken: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        passwordResetExpiresAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        notificationLat: {
          type: DataTypes.DOUBLE,
          allowNull: true,
        },
        notificationLng: {
          type: DataTypes.DOUBLE,
          allowNull: true,
        },
        notificationRadiusKm: {
          type: DataTypes.INTEGER,
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
        tableName: 'users',
        underscored: true,
      },
    );
    return User;
  }
}
