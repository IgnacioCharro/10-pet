'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cases', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      animal_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'abierto',
      },
      resolution_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      urgency_level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      location_text: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      condition: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      phone_contact: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // GEOMETRY column requires raw SQL (Sequelize doesn't support it natively)
    await queryInterface.sequelize.query(
      `ALTER TABLE cases ADD COLUMN location GEOMETRY(Point, 4326) NOT NULL;`,
    );

    // CHECK constraints
    await queryInterface.sequelize.query(`
      ALTER TABLE cases
        ADD CONSTRAINT cases_animal_type_check
          CHECK (animal_type IN ('perro','gato','otro')),
        ADD CONSTRAINT cases_status_check
          CHECK (status IN ('abierto','en_rescate','resuelto','inactivo','spam')),
        ADD CONSTRAINT cases_resolution_type_check
          CHECK (resolution_type IN ('rescatado','adoptado','fallecido','sin_novedad') OR resolution_type IS NULL),
        ADD CONSTRAINT cases_urgency_level_check
          CHECK (urgency_level BETWEEN 1 AND 5);
    `);

    // Indexes
    await queryInterface.sequelize.query(
      `CREATE INDEX idx_cases_location ON cases USING GIST(location);`,
    );
    await queryInterface.addIndex('cases', ['status'], { name: 'idx_cases_status' });
    await queryInterface.addIndex('cases', ['user_id'], { name: 'idx_cases_user_id' });
    await queryInterface.addIndex('cases', ['created_at'], { name: 'idx_cases_created_at' });
    await queryInterface.sequelize.query(`
      CREATE INDEX idx_cases_status_urgency ON cases(status, urgency_level DESC)
        WHERE status IN ('abierto','en_rescate');
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cases');
  },
};
