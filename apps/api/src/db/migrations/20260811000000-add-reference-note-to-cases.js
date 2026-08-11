'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Nota libre del publicador ("frente al kiosco", "a media cuadra de la plaza").
    // Va aparte de location_text, que es la direccion que escriben el geocoder y el
    // reverse-geocoder: hasta ahora compartian campo y se pisaban entre si.
    // Nullable y sin default: no reescribe la tabla.
    await queryInterface.addColumn('cases', 'reference_note', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('cases', 'reference_note');
  },
};
