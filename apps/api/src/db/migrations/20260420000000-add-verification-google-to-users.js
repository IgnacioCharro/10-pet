'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'email_verification_token', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'email_verification_token_expires_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'google_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'email_verification_token');
    await queryInterface.removeColumn('users', 'email_verification_token_expires_at');
    await queryInterface.removeColumn('users', 'google_id');
  },
};
