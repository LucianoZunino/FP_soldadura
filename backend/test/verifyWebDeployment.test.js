const test = require('node:test');
const assert = require('node:assert/strict');

const { verifyResponses } = require('../../scripts/verify-web-deployment');

test('aprueba un despliegue LKN saludable con la version esperada', () => {
  const result = verifyResponses({
    health: { ok: true, release: 'abc123', operationalDate: '2026-10-22' },
    sync: {
      source: 'lkn',
      lkn: { enabled: true, started: true, lastError: null, lastResult: {} }
    },
    lknHealth: { level: 'ok' },
    expectedRelease: 'abc123'
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.failures, []);
});

test('rechaza fuente incorrecta, scheduler detenido o monitor critico', () => {
  const result = verifyResponses({
    health: { ok: true, release: 'old' },
    sync: { source: 'csv', lkn: { enabled: false, started: false, lastError: null } },
    lknHealth: { level: 'critical' },
    expectedRelease: 'new'
  });

  assert.deepEqual(result.failures, [
    'release-mismatch',
    'source-not-lkn',
    'lkn-disabled',
    'lkn-not-started',
    'lkn-health-critical'
  ]);
});
