'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('contacts', {
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
      initiator_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      responder_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'pending',
      },
      contact_method: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'whatsapp',
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      last_message_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE contacts
        ADD CONSTRAINT contacts_status_check
          CHECK (status IN ('pending','active','completed','rejected'));
    `);

    await queryInterface.addConstraint('contacts', {
      fields: ['case_id', 'initiator_id'],
      type: 'unique',
      name: 'uq_contacts_case_initiator',
    });

    await queryInterface.addIndex('contacts', ['case_id'], { name: 'idx_contacts_case_id' });
    await queryInterface.addIndex('contacts', ['initiator_id'], { name: 'idx_contacts_initiator' });
    await queryInterface.addIndex('contacts', ['responder_id'], { name: 'idx_contacts_responder' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('contacts');
  },
};
