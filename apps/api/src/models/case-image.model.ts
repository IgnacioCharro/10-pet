import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

interface CaseImageAttributes {
  id: string;
  caseId: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  position: number;
}

type CaseImageCreationAttributes = Optional<CaseImageAttributes, 'id' | 'position'>;

export class CaseImage
  extends Model<CaseImageAttributes, CaseImageCreationAttributes>
  implements CaseImageAttributes
{
  declare id: string;
  declare caseId: string;
  declare cloudinaryUrl: string;
  declare cloudinaryPublicId: string;
  declare position: number;

  static initModel(sequelize: Sequelize): typeof CaseImage {
    CaseImage.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        caseId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        cloudinaryUrl: {
          type: DataTypes.STRING(500),
          allowNull: false,
        },
        cloudinaryPublicId: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        position: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        tableName: 'case_images',
        underscored: true,
        timestamps: false,
      },
    );
    return CaseImage;
  }
}
