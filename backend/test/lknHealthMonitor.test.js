const test = require('node:test');
const assert = require('node:assert/strict');

const { evaluateLknHealth } = require('../src/services/lknHealthMonitor');

function healthyInput() {
  return {
    scheduler: {
      enabled: true,
      started: true,
      lastError: null,
      lastResult: { sourceRows: 200 }
    },
    metrics: {
      operationalDate: '2026-10-22',
      sourceRows: 200,
      machines: 59,
      sourceLagSeconds: 20,
      lastSourceUpdate: '2026-10-22 12:00:00'
    },
    maxSourceLagSeconds: 900,
    minMachines: 55
  };
}

test('informa salud LKN correcta cuando scheduler y staging avanzan', () => {
  const result = evaluateLknHealth(healthyInput());

  assert.equal(result.ok, true);
  assert.equal(result.level, 'ok');
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.warnings, []);
});

test('marca como critica una sincronizacion con fuente vacia', () => {
  const input = healthyInput();
  input.scheduler.lastResult = { skipped: true, reason: 'empty-source' };

  const result = evaluateLknHealth(input);

  assert.equal(result.ok, false);
  assert.equal(result.level, 'critical');
  assert.ok(result.failures.includes('empty-source'));
});

test('advierte por staging atrasado o cobertura baja sin ocultarlo al operador', () => {
  const input = healthyInput();
  input.metrics.sourceLagSeconds = 901;
  input.metrics.machines = 54;

  const result = evaluateLknHealth(input);

  assert.equal(result.ok, true);
  assert.equal(result.level, 'warning');
  assert.deepEqual(result.warnings, ['source-stale', 'machine-coverage-low']);
});
