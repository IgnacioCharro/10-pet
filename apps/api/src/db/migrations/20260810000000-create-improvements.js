'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('improvements', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      // Ruta donde se tomó la nota, para no tener que reconstruir el contexto después.
      route: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'pending',
      },
      // Qué se hizo al resolverla (número de PR, motivo del descarte).
      resolution_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE improvements
        ADD CONSTRAINT improvements_status_check
          CHECK (status IN ('pending','resolved','descartado'));
    `);

    await queryInterface.addIndex('improvements', ['status'], { name: 'idx_improvements_status' });
    await queryInterface.addIndex('improvements', ['created_at'], { name: 'idx_improvements_created_at' });

    // Supabase abre toda tabla nueva a anon y authenticated (TRUNCATE incluido). El resto
    // de las tablas del proyecto solo dejan privilegios a service_role: esta va igual.
    await queryInterface.sequelize.query(`
      REVOKE ALL ON TABLE improvements FROM anon, authenticated;
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('improvements');
  },
};
