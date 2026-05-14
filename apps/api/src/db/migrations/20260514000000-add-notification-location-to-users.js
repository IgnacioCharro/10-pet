'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'notification_lat', {
      type: Sequelize.DOUBLE,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'notification_lng', {
      type: Sequelize.DOUBLE,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'notification_radius_km', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'notification_lat');
    await queryInterface.removeColumn('users', 'notification_lng');
    await queryInterface.removeColumn('users', 'notification_radius_km');
  },
};
