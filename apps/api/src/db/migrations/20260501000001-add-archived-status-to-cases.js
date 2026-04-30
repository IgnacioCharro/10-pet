'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE cases
        DROP CONSTRAINT cases_status_check,
        ADD CONSTRAINT cases_status_check
          CHECK (status IN ('abierto','en_rescate','resuelto','inactivo','spam','eliminado','archivado'));
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE cases
        DROP CONSTRAINT cases_status_check,
        ADD CONSTRAINT cases_status_check
          CHECK (status IN ('abierto','en_rescate','resuelto','inactivo','spam','eliminado'));
    `);
  },
};
