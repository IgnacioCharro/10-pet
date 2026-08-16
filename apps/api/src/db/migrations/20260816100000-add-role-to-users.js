'use strict';

/**
 * Rol de usuario. Ver docs/superpowers/specs/2026-08-16-panel-admin-roles-design.md.
 *
 * El valor 'admin' es ETIQUETA, no permiso: quien entra al panel lo sigue
 * decidiendo la variable de entorno ADMIN_EMAILS. Si el permiso viviera aca, un
 * error editando la propia fila dejaria al unico admin afuera del panel, sin
 * forma de volver salvo entrar por SQL.
 *
 * El backfill LEE is_vet y escribe role, nunca al reves: asi el down puede tirar
 * la columna sin dejar el booleano corrupto.
 */

const ROLES = ['comun', 'tester', 'voluntario', 'veterinario', 'admin'];

const list = (values) => values.map((v) => `'${v}'`).join(',');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'role', {
      type: Sequelize.TEXT,
      allowNull: false,
      defaultValue: 'comun',
    });
    await queryInterface.sequelize.query(`
      ALTER TABLE users
        ADD CONSTRAINT users_role_check CHECK (role IN (${list(ROLES)}));
    `);
    await queryInterface.sequelize.query(`
      UPDATE users SET role = 'veterinario' WHERE is_vet = true;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE users DROP CONSTRAINT users_role_check;
    `);
    await queryInterface.removeColumn('users', 'role');
  },
};
