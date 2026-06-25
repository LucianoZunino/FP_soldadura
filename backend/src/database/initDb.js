const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

const REQUIRED_ENV_VARS = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

function quoteIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, '``')}\``;
}

function getServerConfig() {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required database environment variables: ${missing.join(', ')}`);
  }

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true
  };
}

function getDbName() {
  return process.env.DB_NAME;
}

async function initDb() {
  const dbName = getDbName();
  const connection = await mysql.createConnection(getServerConfig());

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(dbName)}
       CHARACTER SET utf8mb4
       COLLATE utf8mb4_unicode_ci`
    );

    await connection.query(`USE ${quoteIdentifier(dbName)}`);

    const initSqlPath = path.resolve(__dirname, '../../database/init.sql');
    const initSql = await fs.readFile(initSqlPath, 'utf8');
    const schemaSql = initSql
      .replace(/CREATE DATABASE IF NOT EXISTS\s+ferrosider_produccion_soldadura\s+CHARACTER SET utf8mb4\s+COLLATE utf8mb4_unicode_ci;/i, '')
      .replace(/USE\s+ferrosider_produccion_soldadura;/i, '');

    await connection.query(schemaSql);

    console.log(`Database initialized: ${dbName}`);
  } finally {
    await connection.end();
  }
}

initDb().catch((error) => {
  console.error('Database initialization failed');
  console.error(error.message);
  process.exit(1);
});
