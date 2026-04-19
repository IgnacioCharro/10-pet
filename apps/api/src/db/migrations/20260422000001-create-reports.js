'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reports', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false,
      },
      reporter_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      target_case_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'cases', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      target_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      reason: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'pending',
      },
      reviewed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE reports
        ADD CONSTRAINT reports_reason_check
          CHECK (reason IN ('spam','contenido_inapropiado','falso','acoso','otro')),
        ADD CONSTRAINT reports_status_check
          CHECK (status IN ('pending','reviewed','dismissed','actioned')),
        ADD CONSTRAINT reports_target_check
          CHECK (target_case_id IS NOT NULL OR target_user_id IS NOT NULL);
    `);

    await queryInterface.addIndex('reports', ['status'], { name: 'idx_reports_status' });
    await queryInterface.addIndex('reports', ['reporter_id'], { name: 'idx_reports_reporter_id' });
    await queryInterface.addIndex('reports', ['target_case_id'], { name: 'idx_reports_target_case' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('reports');
  },
};
