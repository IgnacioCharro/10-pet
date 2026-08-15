'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('contact_messages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false,
      },
      // El hilo es la solicitud de ayuda: no hay tabla de conversaciones porque
      // no hace falta inventarla. Si se borra el caso, cascadea la solicitud y
      // con ella sus mensajes.
      contact_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'contacts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      // RESTRICT como initiator_id y responder_id de contacts: un usuario con
      // mensajes escritos no se borra por accidente y deja el hilo cojo.
      sender_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Espejo del schema Zod (MESSAGE_MAX_LENGTH en contacts.messaging.ts). Sin
    // esto, un mensaje vacio o de un megabyte entra igual por cualquier via que
    // no pase por el validador.
    await queryInterface.sequelize.query(`
      ALTER TABLE contact_messages
        ADD CONSTRAINT contact_messages_body_check
          CHECK (char_length(body) BETWEEN 1 AND 2000);
    `);

    // El unico acceso real es "los mensajes de este hilo, en orden": un indice
    // compuesto y no dos sueltos.
    await queryInterface.addIndex('contact_messages', ['contact_id', 'created_at'], {
      name: 'idx_contact_messages_contact_created',
    });
    // Para el contador de no leidos, que filtra por quien NO escribio.
    await queryInterface.addIndex('contact_messages', ['sender_id'], {
      name: 'idx_contact_messages_sender',
    });

    // Supabase abre toda tabla nueva a anon y authenticated (TRUNCATE incluido). El resto
    // de las tablas del proyecto solo dejan privilegios a service_role: esta va igual.
    await queryInterface.sequelize.query(`
      REVOKE ALL ON TABLE contact_messages FROM anon, authenticated;
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('contact_messages');
  },
};
