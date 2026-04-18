'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('case_images', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false,
      },
      case_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'cases', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      cloudinary_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      cloudinary_public_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    });

    await queryInterface.addIndex('case_images', ['case_id'], { name: 'idx_case_images_case_id' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('case_images');
  },
};
