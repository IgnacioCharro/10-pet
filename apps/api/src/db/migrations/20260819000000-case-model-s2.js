'use strict';

/**
 * S2 — modelo de caso ampliado.
 *
 * Cuatro columnas nuevas (titulo, codigo publico, estado del animal, cuando se
 * lo vio), dos CHECK ampliados (el tercer tipo de publicacion y la especie ave)
 * y el retiro de `condition`, cuyo texto libre se vuelca a la descripcion.
 *
 * El codigo publico lo genera Postgres por DEFAULT sobre una secuencia: si lo
 * calculara el servicio con un max+1, dos publicaciones simultaneas se llevarian
 * el mismo codigo.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);

    // --- titulo: nullable, se rellena, y recien despues NOT NULL ---
    await q(`ALTER TABLE cases ADD COLUMN title VARCHAR(120);`);
    await q(`
      UPDATE cases SET title = btrim(
        CASE animal_type
          WHEN 'perro'   THEN 'Perro'
          WHEN 'gato'    THEN 'Gato'
          WHEN 'caballo' THEN 'Caballo'
          WHEN 'vaca'    THEN 'Vaca'
          WHEN 'ave'     THEN 'Ave'
          ELSE 'Animal'
        END
        || COALESCE(' ' || animal_size, '')
      );
    `);
    await q(`ALTER TABLE cases ALTER COLUMN title SET NOT NULL;`);

    // --- codigo publico ---
    await q(`CREATE SEQUENCE cases_public_code_seq START 1000;`);
    await q(`ALTER TABLE cases ADD COLUMN public_code VARCHAR(12);`);
    await q(`UPDATE cases SET public_code = 'C-' || nextval('cases_public_code_seq');`);
    await q(`
      ALTER TABLE cases
        ALTER COLUMN public_code SET DEFAULT 'C-' || nextval('cases_public_code_seq');
    `);
    await q(`ALTER TABLE cases ALTER COLUMN public_code SET NOT NULL;`);
    await q(`ALTER TABLE cases ADD CONSTRAINT cases_public_code_key UNIQUE (public_code);`);
    // La secuencia muere con la columna: sin esto queda huerfana si alguien
    // dropea public_code sin pasar por el down().
    await q(`ALTER SEQUENCE cases_public_code_seq OWNED BY cases.public_code;`);

    // --- estado del animal ---
    await q(`ALTER TABLE cases ADD COLUMN animal_condition VARCHAR(20);`);
    await q(`
      ALTER TABLE cases
        ADD CONSTRAINT cases_animal_condition_check
          CHECK (animal_condition IN ('herido','sano','asustado','debil','no_pude_acercarme'));
    `);

    // --- cuando se lo vio ---
    await q(`ALTER TABLE cases ADD COLUMN seen_at TIMESTAMPTZ;`);
    await q(`UPDATE cases SET seen_at = created_at;`);

    // --- retiro de condition: el texto se anexa a la descripcion ---
    await q(`
      UPDATE cases
      SET description = description || E'\\n\\n' || condition
      WHERE condition IS NOT NULL AND btrim(condition) <> '';
    `);
    await q(`ALTER TABLE cases DROP COLUMN condition;`);

    // --- CHECKs ampliados ---
    await q(`ALTER TABLE cases DROP CONSTRAINT cases_listing_type_check;`);
    await q(`
      ALTER TABLE cases
        ADD CONSTRAINT cases_listing_type_check
          CHECK (listing_type IN ('found','lost','at_risk'));
    `);
    await q(`ALTER TABLE cases DROP CONSTRAINT cases_animal_type_check;`);
    await q(`
      ALTER TABLE cases
        ADD CONSTRAINT cases_animal_type_check
          CHECK (animal_type IN ('perro','gato','caballo','vaca','ave','otro'));
    `);
  },

  /**
   * Reversible salvo un detalle: el texto que se volco a la descripcion no se
   * vuelve a separar. La columna condition vuelve vacia.
   */
  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);

    await q(`UPDATE cases SET listing_type = 'found' WHERE listing_type = 'at_risk';`);
    await q(`ALTER TABLE cases DROP CONSTRAINT cases_listing_type_check;`);
    await q(`
      ALTER TABLE cases
        ADD CONSTRAINT cases_listing_type_check
          CHECK (listing_type IN ('found','lost'));
    `);

    await q(`UPDATE cases SET animal_type = 'otro' WHERE animal_type = 'ave';`);
    await q(`ALTER TABLE cases DROP CONSTRAINT cases_animal_type_check;`);
    await q(`
      ALTER TABLE cases
        ADD CONSTRAINT cases_animal_type_check
          CHECK (animal_type IN ('perro','gato','caballo','vaca','otro'));
    `);

    await q(`ALTER TABLE cases ADD COLUMN condition VARCHAR(100);`);
    await q(`ALTER TABLE cases DROP CONSTRAINT cases_animal_condition_check;`);
    await q(`ALTER TABLE cases DROP COLUMN animal_condition;`);
    await q(`ALTER TABLE cases DROP COLUMN seen_at;`);
    await q(`ALTER TABLE cases DROP COLUMN title;`);
    await q(`ALTER TABLE cases DROP CONSTRAINT cases_public_code_key;`);
    await q(`ALTER TABLE cases DROP COLUMN public_code;`);
    await q(`DROP SEQUENCE IF EXISTS cases_public_code_seq;`);
  },
};
