import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

interface UserAttributes {
  id: string;
  email: string;
  passwordHash: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type UserCreationAttributes = Optional<
  UserAttributes,
  'id' | 'passwordHash' | 'emailVerified' | 'createdAt' | 'updatedAt'
>;

export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  declare id: string;
  declare email: string;
  declare passwordHash: string | null;
  declare emailVerified: boolean;
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
        passwordHash: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        emailVerified: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
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
