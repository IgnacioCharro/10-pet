'use strict';

/**
 * El CHECK de animal_type quedo con los tres valores originales mientras que el
 * enum de Zod y el selector del wizard ya ofrecian 'caballo' y 'vaca'. Publicar
 * uno de esos dos reventaba con check violation y salia como 500.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE cases DROP CONSTRAINT cases_animal_type_check;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE cases
        ADD CONSTRAINT cases_animal_type_check
          CHECK (animal_type IN ('perro','gato','caballo','vaca','otro'));
    `);
  },

  async down(queryInterface) {
    // Los casos que usen los tipos nuevos violarian el constraint viejo.
    await queryInterface.sequelize.query(`
      UPDATE cases SET animal_type = 'otro' WHERE animal_type IN ('caballo','vaca');
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE cases DROP CONSTRAINT cases_animal_type_check;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE cases
        ADD CONSTRAINT cases_animal_type_check
          CHECK (animal_type IN ('perro','gato','otro'));
    `);
  },
};
