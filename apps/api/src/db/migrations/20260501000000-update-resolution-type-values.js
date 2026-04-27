'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE cases
        DROP CONSTRAINT IF EXISTS cases_resolution_type_check,
        ADD CONSTRAINT cases_resolution_type_check
          CHECK (resolution_type IN (
            'adoptado','en_transito','zoonosis','derivado_ong',
            'fallecio','sin_paradero','otro'
          ) OR resolution_type IS NULL);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE cases
        DROP CONSTRAINT IF EXISTS cases_resolution_type_check,
        ADD CONSTRAINT cases_resolution_type_check
          CHECK (resolution_type IN ('rescatado','adoptado','fallecido','sin_novedad')
            OR resolution_type IS NULL);
    `);
  },
};
