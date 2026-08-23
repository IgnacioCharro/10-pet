'use strict';

/**
 * Donde esta el animal ahora, que es distinto de donde se lo vio.
 *
 * La ubicacion del caso significa siempre el lugar del avistamiento: el
 * domicilio de quien rescata no entra al sistema. Esta columna dice si el
 * animal sigue ahi o si alguien lo puso a resguardo.
 *
 * Aditiva a proposito: `listing_type` no se toca aca. Retirar 'at_risk' de su
 * CHECK va en una migration posterior, despues de verificar el deploy, porque
 * dev y prod comparten base y el bundle viejo lo sigue ofreciendo.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);

    await q(`ALTER TABLE cases ADD COLUMN whereabouts VARCHAR(20) NOT NULL DEFAULT 'en_la_calle';`);
    await q(`
      ALTER TABLE cases
        ADD CONSTRAINT cases_whereabouts_check
          CHECK (whereabouts IN ('en_la_calle','con_quien_publica','con_un_tercero','desconocido'));
    `);

    // Un animal buscado no esta en ningun lado conocido: esa es toda la historia.
    await q(`UPDATE cases SET whereabouts = 'desconocido' WHERE listing_type = 'lost';`);

    // El mapa filtra por "a resguardo" en cada carga; sin esto es seq scan.
    await q(`CREATE INDEX cases_whereabouts_idx ON cases (whereabouts);`);
  },

  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);
    await q(`DROP INDEX IF EXISTS cases_whereabouts_idx;`);
    await q(`ALTER TABLE cases DROP CONSTRAINT IF EXISTS cases_whereabouts_check;`);
    await q(`ALTER TABLE cases DROP COLUMN whereabouts;`);
  },
};
