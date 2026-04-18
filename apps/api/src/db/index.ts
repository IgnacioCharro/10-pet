import { Sequelize } from 'sequelize';
import { env } from '../config/env';
import { User } from '../models/user.model';
import { RefreshToken } from '../models/refresh-token.model';

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: 'postgres',
  logging: env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false },
  },
});

User.initModel(sequelize);
RefreshToken.initModel(sequelize);

User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export { User, RefreshToken };

export const connectDb = async (): Promise<void> => {
  await sequelize.authenticate();
};
