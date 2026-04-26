import { Sequelize } from 'sequelize';
import { env } from '../config/env';
import { User } from '../models/user.model';
import { RefreshToken } from '../models/refresh-token.model';
import { Case } from '../models/case.model';
import { CaseImage } from '../models/case-image.model';
import { CaseUpdate } from '../models/case-update.model';
import { Contact } from '../models/contact.model';
import { Report } from '../models/report.model';
import { VetAssistance } from '../models/vet-assistance.model';

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
Contact.initModel(sequelize);
Report.initModel(sequelize);
VetAssistance.initModel(sequelize);

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

// Contact associations
Case.hasMany(Contact, { foreignKey: 'caseId', as: 'contacts' });
Contact.belongsTo(Case, { foreignKey: 'caseId', as: 'case' });

User.hasMany(Contact, { foreignKey: 'initiatorId', as: 'initiatedContacts' });
Contact.belongsTo(User, { foreignKey: 'initiatorId', as: 'initiator' });

User.hasMany(Contact, { foreignKey: 'responderId', as: 'receivedContacts' });
Contact.belongsTo(User, { foreignKey: 'responderId', as: 'responder' });

// Report associations
User.hasMany(Report, { foreignKey: 'reporterId', as: 'reports' });
Report.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });

Case.hasMany(Report, { foreignKey: 'targetCaseId', as: 'reports' });
Report.belongsTo(Case, { foreignKey: 'targetCaseId', as: 'targetCase' });

// VetAssistance associations
Case.hasMany(VetAssistance, { foreignKey: 'caseId', as: 'vetAssistances' });
VetAssistance.belongsTo(Case, { foreignKey: 'caseId', as: 'case' });

User.hasMany(VetAssistance, { foreignKey: 'userId', as: 'vetAssistances' });
VetAssistance.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export { User, RefreshToken, Case, CaseImage, CaseUpdate, Contact, Report, VetAssistance };

export const connectDb = async (): Promise<void> => {
  await sequelize.authenticate();
};
