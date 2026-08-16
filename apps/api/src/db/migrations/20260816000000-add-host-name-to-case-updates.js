'use strict';

/**
 * Nombre de quien aloja al animal, para las novedades de tipo 'alojamiento'.
 *
 * Hasta ahora ese dato vivia suelto dentro de `content` (el placeholder pedia "donde
 * esta ahora, quien lo tiene, hasta cuando"), asi que solo se veia desplegando la
 * fila del timeline. Como columna aparte se puede mostrar en la linea colapsada.
 *
 * Texto libre a proposito: quien aloja suele ser alguien de afuera de la plataforma
 * (un vecino, una veterinaria) y no tiene cuenta a la que apuntar.
 *
 * Aditiva y nullable: las filas viejas quedan en NULL y el timeline no muestra nada.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('case_updates', 'host_name', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('case_updates', 'host_name');
  },
};
