'use strict';

/**
 * El timeline del caso suma dos tipos de novedad: 'alojamiento' y 'salud'.
 *
 * El spec del timeline afirmaba que esto no necesitaba migration porque update_type
 * es varchar y no un enum de Postgres. Es falso: hay un CHECK espejo. Sin esta
 * migration Zod deja pasar los tipos nuevos y el insert pega contra el constraint,
 * asi que la novedad no se puede guardar. Verificado el 14/08 intentando el INSERT:
 * 23514, violates check constraint "case_updates_type_check".
 *
 * (A diferencia del bug de 'caballo'/'vaca' del PR #111, esto **no** sale como 500:
 * el error-handler que ese mismo PR agrego mapea el codigo 23514 a un 400 con el
 * nombre del constraint. Falla claro en vez de mudo, pero falla igual.)
 *
 * ADITIVA A PROPOSITO. 'medicacion' se da de baja en el codigo (sale del z.enum y del
 * formulario, absorbido por 'veterinario') pero **se mantiene en el CHECK**. Sacarlo
 * aca abriria una ventana entre correr la migration y que termine el deploy en la que
 * el frontend vivo todavia ofrece "Medicacion aplicada" y el API vivo todavia la
 * acepta en Zod: esas novedades empezarian a rebotar. Una migration que solo agrega
 * valores se puede correr antes del deploy sin riesgo.
 *
 * Limpieza posterior (opcional, cuando el frontend nuevo lleve un rato en prod):
 * otra migration que reasigne las filas 'medicacion' a 'veterinario' y lo saque del
 * CHECK. Al 14/08 habia 0 filas de ese tipo, asi que no urge.
 */

const ALLOWED = [
  // Legacy: hay filas viejas, se siguen renderizando pero no se ofrecen al crear.
  'status_change', 'comment', 'photo_added', 'reactivated',
  // Vigentes.
  'avistamiento', 'alojamiento', 'salud', 'veterinario', 'comentario',
  // De baja en el codigo, se mantiene aca por la ventana de deploy (ver arriba).
  'medicacion',
];

const PREVIOUS = [
  'status_change', 'comment', 'photo_added', 'reactivated',
  'avistamiento', 'medicacion', 'veterinario', 'comentario',
];

const list = (values) => values.map((v) => `'${v}'`).join(',');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE case_updates DROP CONSTRAINT case_updates_type_check;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE case_updates
        ADD CONSTRAINT case_updates_type_check
          CHECK (update_type IN (${list(ALLOWED)}));
    `);
  },

  async down(queryInterface) {
    // Las filas con los tipos nuevos violarian el constraint viejo: van al cajon generico.
    await queryInterface.sequelize.query(`
      UPDATE case_updates SET update_type = 'comentario'
        WHERE update_type IN ('alojamiento','salud');
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE case_updates DROP CONSTRAINT case_updates_type_check;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE case_updates
        ADD CONSTRAINT case_updates_type_check
          CHECK (update_type IN (${list(PREVIOUS)}));
    `);
  },
};
