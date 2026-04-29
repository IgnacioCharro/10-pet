'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cases', 'listing_type', {
      type: Sequelize.STRING(10),
      allowNull: false,
      defaultValue: 'found',
    });
    await queryInterface.addConstraint('cases', {
      fields: ['listing_type'],
      type: 'check',
      name: 'cases_listing_type_check',
      where: { listing_type: ['found', 'lost'] },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('cases', 'cases_listing_type_check');
    await queryInterface.removeColumn('cases', 'listing_type');
  },
};
