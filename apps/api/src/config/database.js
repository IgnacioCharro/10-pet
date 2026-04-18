const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });

const ssl = { require: true, rejectUnauthorized: false };

module.exports = {
  development: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: { ssl },
  },
  test: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: { ssl },
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: { ssl },
  },
};
