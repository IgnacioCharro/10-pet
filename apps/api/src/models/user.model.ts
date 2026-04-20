import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

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
  bannedAt: Date | null;
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
  | 'bannedAt'
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
  declare bannedAt: Date | null;
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
        bannedAt: {
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
        tableName: 'users',
        underscored: true,
      },
    );
    return User;
  }
}
