'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Una marca por parte, no una sola por hilo: si compartieran columna, que uno
    // abriera la conversacion le borraria los no leidos al otro.
    //
    // NULL significa "nunca abrio este hilo", y entonces todo esta sin leer. Por
    // eso quedan nulas para las solicitudes que ya existen: ninguna tiene
    // mensajes todavia, asi que el contador arranca en cero igual.
    await queryInterface.addColumn('contacts', 'initiator_read_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('contacts', 'responder_read_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('contacts', 'initiator_read_at');
    await queryInterface.removeColumn('contacts', 'responder_read_at');
  },
};
