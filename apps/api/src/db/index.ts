import { Sequelize } from 'sequelize';
import { env } from '../config/env';
import { User } from '../models/user.model';

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: 'postgres',
  logging: env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false },
  },
});

User.initModel(sequelize);

export { User };

export const connectDb = async (): Promise<void> => {
  await sequelize.authenticate();
};
