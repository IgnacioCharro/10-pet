import { Sequelize } from 'sequelize';
import { env } from '../config/env';
import { User } from '../models/user.model';
import { RefreshToken } from '../models/refresh-token.model';
import { Case } from '../models/case.model';
import { CaseImage } from '../models/case-image.model';
import { CaseUpdate } from '../models/case-update.model';

export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: 'postgres',
  logging: env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false },
  },
});

User.initModel(sequelize);
RefreshToken.initModel(sequelize);
Case.initModel(sequelize);
CaseImage.initModel(sequelize);
CaseUpdate.initModel(sequelize);

// Auth associations
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Case associations
User.hasMany(Case, { foreignKey: 'userId', as: 'cases' });
Case.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Case.hasMany(CaseImage, { foreignKey: 'caseId', as: 'images' });
CaseImage.belongsTo(Case, { foreignKey: 'caseId', as: 'case' });

Case.hasMany(CaseUpdate, { foreignKey: 'caseId', as: 'updates' });
CaseUpdate.belongsTo(Case, { foreignKey: 'caseId', as: 'case' });

User.hasMany(CaseUpdate, { foreignKey: 'userId', as: 'caseUpdates' });
CaseUpdate.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export { User, RefreshToken, Case, CaseImage, CaseUpdate };

export const connectDb = async (): Promise<void> => {
  await sequelize.authenticate();
};
