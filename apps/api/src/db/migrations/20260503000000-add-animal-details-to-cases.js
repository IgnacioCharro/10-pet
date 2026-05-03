'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cases', 'animal_sex', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
    await queryInterface.addColumn('cases', 'animal_size', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
    await queryInterface.addColumn('cases', 'animal_color', {
      type: Sequelize.STRING(30),
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE cases
        ADD CONSTRAINT cases_animal_sex_check
          CHECK (animal_sex IN ('macho','hembra','desconocido') OR animal_sex IS NULL),
        ADD CONSTRAINT cases_animal_size_check
          CHECK (animal_size IN ('chico','mediano','grande') OR animal_size IS NULL),
        ADD CONSTRAINT cases_animal_color_check
          CHECK (animal_color IN ('negro','blanco','marron','gris','dorado','manchado','tricolor') OR animal_color IS NULL);
    `);

    await queryInterface.sequelize.query(
      `CREATE INDEX idx_cases_animal_sex_size ON cases(animal_sex, animal_size)
       WHERE animal_sex IS NOT NULL OR animal_size IS NOT NULL;`,
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS idx_cases_animal_sex_size;`,
    );
    await queryInterface.sequelize.query(`
      ALTER TABLE cases
        DROP CONSTRAINT IF EXISTS cases_animal_sex_check,
        DROP CONSTRAINT IF EXISTS cases_animal_size_check,
        DROP CONSTRAINT IF EXISTS cases_animal_color_check;
    `);
    await queryInterface.removeColumn('cases', 'animal_sex');
    await queryInterface.removeColumn('cases', 'animal_size');
    await queryInterface.removeColumn('cases', 'animal_color');
  },
};
