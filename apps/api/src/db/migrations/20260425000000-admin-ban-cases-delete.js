'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'banned_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });

    // Extend status check to include 'eliminado'
    await queryInterface.sequelize.query(`
      ALTER TABLE cases
        DROP CONSTRAINT cases_status_check,
        ADD CONSTRAINT cases_status_check
          CHECK (status IN ('abierto','en_rescate','resuelto','inactivo','spam','eliminado'));
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'banned_at');

    await queryInterface.sequelize.query(`
      ALTER TABLE cases
        DROP CONSTRAINT cases_status_check,
        ADD CONSTRAINT cases_status_check
          CHECK (status IN ('abierto','en_rescate','resuelto','inactivo','spam'));
    `);
  },
};
