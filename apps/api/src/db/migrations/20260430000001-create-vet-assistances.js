'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vet_assistances', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        allowNull: false,
      },
      case_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'cases', key: 'id' },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      procedure: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      medication: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      attended_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('vet_assistances', ['case_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('vet_assistances');
  },
};
