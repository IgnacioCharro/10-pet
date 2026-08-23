'use strict';

/**
 * Retira 'at_risk' de listing_type.
 *
 * Era el eje del estado del animal disfrazado de tipo de publicacion: un animal
 * en riesgo ya se describe con urgency_level y animal_condition. Lo que
 * 'at_risk' queria decir de verdad —que nadie lo levanto— ahora lo dice
 * whereabouts = 'en_la_calle'.
 *
 * Va separada de la migration que agrego whereabouts y se corre despues del
 * deploy: cerrar la CHECK mientras el bundle viejo sigue ofreciendo el tipo le
 * da un 500 a quien lo elija.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);

    // Red de seguridad: si entro alguno entre el deploy y esta migration, cae
    // en found + en_la_calle, que es lo que at_risk significaba.
    await q(`
      UPDATE cases
      SET listing_type = 'found', whereabouts = 'en_la_calle'
      WHERE listing_type = 'at_risk';
    `);

    await q(`ALTER TABLE cases DROP CONSTRAINT cases_listing_type_check;`);
    await q(`
      ALTER TABLE cases
        ADD CONSTRAINT cases_listing_type_check
          CHECK (listing_type IN ('found','lost'));
    `);
  },

  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q(`ALTER TABLE cases DROP CONSTRAINT cases_listing_type_check;`);
    await q(`
      ALTER TABLE cases
        ADD CONSTRAINT cases_listing_type_check
          CHECK (listing_type IN ('found','lost','at_risk'));
    `);
  },
};
