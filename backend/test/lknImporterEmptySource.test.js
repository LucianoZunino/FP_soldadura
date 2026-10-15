const assert = require('node:assert/strict');
const test = require('node:test');

test('an empty LKN source preserves existing production without opening a transaction', async () => {
  const calls = [];
  const connection = {
    async execute(sql) {
      calls.push(sql);
      return [[]];
    },
    async beginTransaction() {
      calls.push('BEGIN');
    },
    release() {
      calls.push('RELEASE');
    }
  };
  const pool = {
    async getConnection() {
      return connection;
    },
    async end() {
      calls.push('POOL_END');
    }
  };
  const dbPath = require.resolve('../src/config/db');
  const importerPath = require.resolve('../src/services/lknImporter');
  const originalDbModule = require.cache[dbPath];

  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: { createPool: () => pool }
  };
  delete require.cache[importerPath];

  try {
    const { importLknProduction } = require(importerPath);
    const result = await importLknProduction({ fecha: '2099-01-01', replaceDate: true });

    assert.equal(result.skipped, true);
    assert.equal(result.reason, 'empty-source');
    assert.equal(result.preservedExistingData, true);
    assert.equal(result.sourceRows, 0);
    assert.equal(result.rowsImported, 0);
    assert.equal(calls.some((sql) => String(sql).includes('DELETE FROM produccion_hora')), false);
    assert.equal(calls.includes('BEGIN'), false);
    assert.equal(calls.includes('RELEASE'), true);
    assert.equal(calls.includes('POOL_END'), true);
  } finally {
    delete require.cache[importerPath];

    if (originalDbModule) {
      require.cache[dbPath] = originalDbModule;
    } else {
      delete require.cache[dbPath];
    }
  }
});
