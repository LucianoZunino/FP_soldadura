const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveFechaModificada,
  sanitizePrematurePositive
} = require('../src/services/lknImporter');

test('conserva fecha_operativa de LKN para todo el Turno 3', () => {
  assert.equal(resolveFechaModificada('2026-09-02', 3, '00:00:00'), '2026-09-02');
  assert.equal(resolveFechaModificada('2026-09-02', 3, '05:00:00'), '2026-09-02');
  assert.equal(resolveFechaModificada('2026-09-02', 3, '22:00:00'), '2026-09-02');
});

test('convierte en cero un positivo leido antes de que comience su hora', () => {
  const mapped = { maquina: 'TUCKER_TUNNEL', cantidad: 20 };
  const result = sanitizePrematurePositive(mapped, { lectura_anticipada: 1 });

  assert.deepEqual(result, {
    record: { maquina: 'TUCKER_TUNNEL', cantidad: 0 },
    reset: true,
    discardedQuantity: 20
  });
  assert.equal(mapped.cantidad, 20);
});

test('conserva el positivo cuya lectura pertenece a su hora', () => {
  const mapped = { maquina: 'TUCKER_CAJA_DE_AGUA', cantidad: 17 };
  const result = sanitizePrematurePositive(mapped, { lectura_anticipada: 0 });

  assert.equal(result.record, mapped);
  assert.equal(result.record.cantidad, 17);
  assert.equal(result.reset, false);
});

test('conserva en cero una combinacion que no produjo', () => {
  const mapped = { maquina: 'TUCKER_APRON_ALETA', cantidad: 0 };
  const result = sanitizePrematurePositive(mapped, { lectura_anticipada: 1 });

  assert.equal(result.record, mapped);
  assert.equal(result.record.cantidad, 0);
  assert.equal(result.reset, false);
});
