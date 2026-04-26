'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE case_updates DROP CONSTRAINT case_updates_type_check;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE case_updates
        ADD CONSTRAINT case_updates_type_check
          CHECK (update_type IN (
            'status_change','comment','photo_added','reactivated',
            'avistamiento','medicacion','veterinario','comentario'
          ));
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE case_updates DROP CONSTRAINT case_updates_type_check;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE case_updates
        ADD CONSTRAINT case_updates_type_check
          CHECK (update_type IN ('status_change','comment','photo_added','reactivated'));
    `);
  },
};
