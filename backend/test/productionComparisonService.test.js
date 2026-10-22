const test = require('node:test');
const assert = require('node:assert/strict');

const {
  compareProductionSnapshots,
  isClosedBlock,
  parseCsvSnapshot
} = require('../src/services/productionComparisonService');

test('parsea las 24 horas de cada combinacion del CSV', () => {
  const row = ['0', 'CELDA_7', 'APRON OP80', '0'];
  for (let index = 0; index < 28; index += 1) row.push(String(index));

  const records = parseCsvSnapshot(`${row.join(',')}\n`);

  assert.equal(records.length, 24);
  assert.equal(records[0].horaDesde, '06:00:00');
  assert.equal(records[23].horaDesde, '05:00:00');
});

test('interpreta como cero una fila destino ausente y reporta diferencias reales', () => {
  const csvRecords = [
    { celda: 'CELDA_1', pieza: 'A', turno: 1, horaDesde: '06:00:00', cantidad: 0 },
    { celda: 'CELDA_1', pieza: 'A', turno: 1, horaDesde: '07:00:00', cantidad: 12 }
  ];
  const databaseRecords = [];
  const result = compareProductionSnapshots(csvRecords, databaseRecords, {
    fecha: '2026-10-21'
  });

  assert.equal(result.exactMatches, 1);
  assert.equal(result.missingDestinationRows, 2);
  assert.equal(result.differenceCount, 1);
  assert.equal(result.differences[0].csv, 12);
  assert.equal(result.differences[0].database, 0);
});

test('closed-only excluye el bloque que todavia esta abierto', () => {
  const now = new Date('2026-10-22T13:30:00-03:00');

  assert.equal(isClosedBlock('2026-10-22', '11:00:00', now), true);
  assert.equal(isClosedBlock('2026-10-22', '13:00:00', now), false);
  assert.equal(isClosedBlock('2026-10-21', '05:00:00', now), true);
});
