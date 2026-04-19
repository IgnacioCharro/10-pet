import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

export type ContactStatus = 'pending' | 'active' | 'completed' | 'rejected';

interface ContactAttributes {
  id: string;
  caseId: string;
  initiatorId: string;
  responderId: string;
  status: ContactStatus;
  contactMethod: string;
  message: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type ContactCreationAttributes = Optional<
  ContactAttributes,
  'id' | 'status' | 'contactMethod' | 'message' | 'lastMessageAt' | 'createdAt' | 'updatedAt'
>;

export class Contact
  extends Model<ContactAttributes, ContactCreationAttributes>
  implements ContactAttributes
{
  declare id: string;
  declare caseId: string;
  declare initiatorId: string;
  declare responderId: string;
  declare status: ContactStatus;
  declare contactMethod: string;
  declare message: string | null;
  declare lastMessageAt: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  static initModel(sequelize: Sequelize): void {
    Contact.init(
      {
        id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
        caseId: { type: DataTypes.UUID, allowNull: false },
        initiatorId: { type: DataTypes.UUID, allowNull: false },
        responderId: { type: DataTypes.UUID, allowNull: false },
        status: { type: DataTypes.STRING(50), defaultValue: 'pending' },
        contactMethod: { type: DataTypes.STRING(50), defaultValue: 'whatsapp' },
        message: { type: DataTypes.TEXT, allowNull: true },
        lastMessageAt: { type: DataTypes.DATE, allowNull: true },
        createdAt: { type: DataTypes.DATE },
        updatedAt: { type: DataTypes.DATE },
      },
      {
        sequelize,
        tableName: 'contacts',
        underscored: true,
        timestamps: true,
      },
    );
  }
}
