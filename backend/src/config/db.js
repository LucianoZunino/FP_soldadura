const mysql = require('mysql2/promise');
require('./env');

const REQUIRED_ENV_VARS = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

function getDbConfig() {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required database environment variables: ${missing.join(', ')}`);
  }

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

function createPool() {
  return mysql.createPool(getDbConfig());
}

module.exports = {
  createPool,
  getDbConfig
};
